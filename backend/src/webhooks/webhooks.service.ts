import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscribeWebhookDto } from './dto/subscribe-webhook.dto';
import axios from 'axios';
import * as crypto from 'crypto';

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
      this.sendPayload(sub, event, payload).catch((err) => {
        this.logger.error(`Webhook failed for ${sub.url}: ${err.message}`);
      });
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

    await axios.post(subscription.url, body, { headers, timeout: 5000 });
    this.logger.log(`Webhook triggered: ${event} -> ${subscription.url}`);
  }
}
