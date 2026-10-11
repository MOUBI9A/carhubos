import { Logger } from '@nestjs/common';
import { TransactionalEmailProvider, EmailPayload, EmailSendResult } from '../email.interface';

export class DevelopmentEmailProvider implements TransactionalEmailProvider {
  readonly name = 'DEVELOPMENT_MOCK';
  private readonly logger = new Logger(DevelopmentEmailProvider.name);

  constructor(private readonly isProduction: boolean = false) {}

  async sendEmail(payload: EmailPayload): Promise<EmailSendResult> {
    if (this.isProduction) {
      this.logger.error(
        'Refusing to mock email delivery in production: no transactional email credentials (RESEND_API_KEY / SMTP) are configured.',
      );
      return {
        success: false,
        error:
          'PRODUCTION_EMAIL_UNCONFIGURED: Real transactional email provider is missing.',
      };
    }

    this.logger.log(
      `[DEV EMAIL DISPATCH] Mock delivery to "${payload.to}" — Subject: "${payload.subject}"`,
    );

    return {
      success: true,
      messageId: `dev-mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    };
  }
}
