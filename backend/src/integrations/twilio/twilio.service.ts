import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio | null = null;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    const isPlaceholder = (val?: string) =>
      !val || val.includes('xxx') || val.includes('placeholder');

    if (accountSid && authToken && !isPlaceholder(accountSid) && !isPlaceholder(authToken)) {
      this.client = new Twilio(accountSid, authToken);
      this.logger.log('Twilio live client initialized for WhatsApp notifications.');
    } else {
      this.logger.log('Twilio credentials unconfigured or placeholder detected. WhatsApp notifications operating in safe mock mode.');
    }
  }

  async sendWhatsAppMessage(to: string, message: string, maxRetries = 2) {
    const from =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      'whatsapp:+14155238886';

    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (!this.client) {
      this.logger.log(`[TWILIO MOCK] WhatsApp notification dispatched to ${formattedTo}: "${message.slice(0, 60)}..."`);
      return { success: true, status: 'mock_sent', to: formattedTo };
    }

    let attempt = 0;
    while (attempt <= maxRetries) {
      attempt++;
      try {
        this.logger.log(`[TWILIO] Sending WhatsApp message to ${formattedTo} (attempt ${attempt}/${maxRetries + 1})...`);
        const result = await this.client.messages.create({
          body: message,
          from,
          to: formattedTo,
        });
        return { success: true, sid: result.sid, status: 'delivered' };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.warn(`[TWILIO RETRY] Delivery attempt ${attempt} failed: ${errorMsg}`);
        if (attempt > maxRetries) {
          this.logger.error(`[DEAD_LETTER_NOTIFICATION] Failed to send WhatsApp message to ${formattedTo} after ${maxRetries + 1} attempts: ${errorMsg}`);
          return { success: false, error: errorMsg, status: 'failed_dead_letter' };
        }
        if (process.env.NODE_ENV !== 'test') {
          await new Promise((r) => setTimeout(r, attempt * 500));
        }
      }
    }
    return { success: false, status: 'failed' };
  }
}
