import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeWebhookDto } from './dto/subscribe-webhook.dto';
import axios from 'axios';
import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { createSsrfSafeLookup } from './webhook-ssrf-guard';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  async subscribe(agencyId: string, data: SubscribeWebhookDto) {
    return this.prisma.webhookSubscription.create({
      data: {
        url: data.url,
        event: data.event,
        secret: data.secret,
        agencyId,
      },
    });
  }

  async unsubscribe(id: string, agencyId: string) {
    return this.prisma.webhookSubscription.delete({
      where: { id, agencyId },
    });
  }

  async findAll(agencyId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { agencyId },
    });
  }

  /**
   * Triggers webhooks for a specific event. Callers (bookings.service.ts's
   * create()/updateStatus(), on the request path) await this synchronously
   * right after the booking/invoice/payment are already committed — this must
   * never throw, or a DB hiccup here turns an already-successful booking into
   * a 500 to the client. Per-subscription sends are already fire-and-forget
   * (.catch, not awaited); the lookup itself was the one unguarded step.
   */
  async trigger(agencyId: string, event: string, payload: any) {
    let subscriptions: Array<{ url: string }>;
    try {
      subscriptions = await this.prisma.webhookSubscription.findMany({
        where: { agencyId, event, isActive: true },
      });
    } catch (err) {
      this.logger.error(
        `Failed to load webhook subscriptions for ${event}: ${(err as Error).message}`,
      );
      return;
    }

    for (const sub of subscriptions) {
      this.sendPayloadWithRetry(sub, event, payload).catch((err) => {
        this.logger.error(`Webhook worker unexpected error: ${err.message}`);
      });
    }
  }

  private async sendPayloadWithRetry(
    subscription: any,
    event: string,
    payload: any,
    maxRetries = 3,
  ) {
    let attempt = 0;
    while (attempt < maxRetries) {
      attempt++;
      try {
        await this.sendPayload(subscription, event, payload);
        return;
      } catch (err: any) {
        this.logger.warn(
          `Webhook attempt ${attempt}/${maxRetries} failed for ${subscription.url}: ${err.message}`,
        );
        if (attempt >= maxRetries) {
          this.logger.error(
            `[DEAD_LETTER_WEBHOOK] Permanently failed to deliver event "${event}" to "${subscription.url}" after ${maxRetries} attempts: ${err.message}`,
          );
          return;
        }
        if (process.env.NODE_ENV !== 'test') {
          const backoffMs = Math.pow(2, attempt) * 200;
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  private async sendPayload(subscription: any, event: string, payload: any) {
    const timestamp = Date.now();
    const body = {
      event,
      timestamp,
      payload,
    };

    const headers: any = {
      'Content-Type': 'application/json',
      'X-CarHub-Event': event,
      'X-CarHub-Timestamp': timestamp.toString(),
    };

    if (subscription.secret) {
      const signature = crypto
        .createHmac('sha256', subscription.secret)
        .update(JSON.stringify(body))
        .digest('hex');
      headers['X-CarHub-Signature'] = signature;
    }

    // DNS-rebinding guard: a fresh Agent per send, so every trigger re-resolves
    // and re-validates the target's IP rather than trusting the subscribe-time
    // hostname check (see webhook-ssrf-guard.ts). maxRedirects: 0 closes the
    // companion vector — a redirect response body pointing at an internal URL.
    const lookup = createSsrfSafeLookup();
    await axios.post(subscription.url, body, {
      headers,
      timeout: 5000,
      maxRedirects: 0,
      httpAgent: new http.Agent({ lookup }),
      httpsAgent: new https.Agent({ lookup }),
    });
    this.logger.log(`Webhook triggered: ${event} -> ${subscription.url}`);
  }
}
