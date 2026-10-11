import { Logger } from '@nestjs/common';
import { TransactionalEmailProvider, EmailPayload, EmailSendResult } from '../email.interface';

export class ResendEmailProvider implements TransactionalEmailProvider {
  readonly name = 'RESEND';
  private readonly logger = new Logger(ResendEmailProvider.name);

  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string = process.env.EMAIL_FROM || 'Fider <noreply@fider.app>',
  ) {}

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [payload.to],
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        this.logger.error(`Resend API failed with status ${res.status}: ${errorBody}`);
        return { success: false, error: `Resend error: ${res.statusText}` };
      }

      const data = await res.json();
      return { success: true, messageId: data.id };
    } catch (err: any) {
      this.logger.error(`Failed to send email via Resend: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }
}
