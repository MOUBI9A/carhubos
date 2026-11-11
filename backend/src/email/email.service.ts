import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TransactionalEmailProvider, EmailSendResult } from './email.interface';
import { ResendEmailProvider } from './providers/resend-email.provider';
import { DevelopmentEmailProvider } from './providers/development-email.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private provider: TransactionalEmailProvider;
  private lastDevVerificationLink: string | null = null;

  constructor(private configService: ConfigService) {
    const resendKey = this.configService.get<string>('RESEND_API_KEY');
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    if (resendKey) {
      this.provider = new ResendEmailProvider(resendKey);
      this.logger.log('Active transactional email provider: Resend');
    } else {
      this.provider = new DevelopmentEmailProvider(isProd);
      if (isProd) {
        this.logger.warn(
          'No production email provider (RESEND_API_KEY) found. Outgoing email will fail closed.',
        );
      } else {
        this.logger.log('Active transactional email provider: Development Mock');
      }
    }
  }

  /**
   * Helper for tests or external configuration inspection.
   */
  getProviderName(): string {
    return this.provider.name;
  }

  getLastDevVerificationLink(): string | null {
    return this.lastDevVerificationLink;
  }

  /**
   * Formats and dispatches a verification link to a freshly signed-up user.
   */
  async sendVerificationEmail(
    email: string,
    name: string,
    token: string,
  ): Promise<EmailSendResult> {
    const publicAppUrl =
      this.configService.get<string>('PUBLIC_APP_URL') ||
      'http://localhost:3002';
    const verificationUrl = `${publicAppUrl}/verify-email?token=${token}`;

    if (process.env.NODE_ENV !== 'production') {
      this.lastDevVerificationLink = verificationUrl;
    }

    const firstName = name.split(' ')[0] || 'there';

    const subject = 'Verify your email for Fider OS';
    const text = `Hello ${firstName},\n\nPlease verify your email to activate your Fider workspace:\n${verificationUrl}\n\nThis verification link expires in 24 hours.\n\nIf you did not sign up for Fider, you can safely ignore this email.`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Verify your email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f1115; color: #f3f4f6; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #171922; border: 1px solid #2a2d3d; border-radius: 16px; padding: 40px; box-shadow: 0 8px 30px rgba(0,0,0,0.5);">
    <div style="margin-bottom: 24px;">
      <span style="font-size: 20px; font-weight: 700; letter-spacing: -0.5px; color: #ffffff;">Fider<span style="color: #9d80d8;">OS</span></span>
      <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-left: 8px;">The Trust Layer</span>
    </div>
    <h1 style="font-size: 22px; font-weight: 600; color: #ffffff; margin-top: 0; margin-bottom: 16px;">Verify your email address</h1>
    <p style="font-size: 14px; line-height: 1.6; color: #d1d5db; margin-bottom: 28px;">
      Welcome, <strong>${firstName}</strong>. Click below to verify your email and unlock your agency workspace and fleet onboarding.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verificationUrl}" style="background-color: #7c3aed; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 14px; text-decoration: none; display: inline-block;">
        Verify email & continue setup
      </a>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #9ca3af; margin-top: 24px;">
      If the button above does not work, copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color: #a78bfa; word-break: break-all;">${verificationUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #2a2d3d; margin: 32px 0 20px 0;">
    <p style="font-size: 11px; color: #6b7280; margin: 0;">
      This link will expire in 24 hours. If you did not create an account on Fider, please disregard this email.
    </p>
  </div>
</body>
</html>
    `;

    return this.provider.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }
}
