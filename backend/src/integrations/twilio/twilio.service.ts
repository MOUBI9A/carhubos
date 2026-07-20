import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    
    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio credentials missing. WhatsApp alerts will be mocked.');
    }
  }

  async sendWhatsAppMessage(to: string, message: string) {
    const from = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') || 'whatsapp:+14155238886';
    
    // Ensure 'to' number is in WhatsApp format
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (this.client) {
      try {
        this.logger.log(`[TWILIO] Sending real WhatsApp message to ${formattedTo}...`);
        const result = await this.client.messages.create({
          body: message,
          from: from,
          to: formattedTo,
        });
        return { success: true, sid: result.sid };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`[TWILIO ERROR] Failed to send message: ${message}`);
        return { success: false, error: message };
      }
    } else {
      this.logger.log(`[TWILIO MOCK] WhatsApp message to ${formattedTo}: ${message}`);
      return { success: true, status: 'mock_sent', to: formattedTo };
    }
  }
}
