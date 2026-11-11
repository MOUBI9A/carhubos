import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

export type GuardianWhatsAppResult = {
  state: 'SIMULATED' | 'UNCONFIGURED' | 'FAILED' | 'PROVIDER_ACCEPTED';
  message: string;
  providerSid?: string;
  providerStatus?: string;
  errorCode?: number;
  acceptanceUnknown?: boolean;
};

@Injectable()
export class TwilioService {
  private readonly logger = new Logger(TwilioService.name);
  private client: Twilio;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.client = new Twilio(accountSid, authToken, {
        timeout: 10000,
        autoRetry: false,
      });
    } else {
      this.logger.warn(
        'Twilio credentials missing. Live WhatsApp is unavailable.',
      );
    }
  }

  /** Guardian is explicitly opted in per agency. Missing credentials never simulate success. */
  guardianWhatsAppAvailability(agencyId: string): {
    state: 'READY' | 'SIMULATED' | 'UNCONFIGURED';
    reason?: string;
  } {
    const agencies = this.configService
      .get<string>('GUARDIAN_WHATSAPP_AGENCY_IDS', '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    if (!agencies.includes(agencyId))
      return {
        state: 'UNCONFIGURED',
        reason:
          'WhatsApp report notifications are not enabled for this agency.',
      };
    const mode = this.configService.get<string>('GUARDIAN_WHATSAPP_MODE');
    if (mode === 'simulated') return { state: 'SIMULATED' };
    const sender = this.configService.get<string>('TWILIO_WHATSAPP_NUMBER', '');
    const contentSid = this.configService.get<string>(
      'GUARDIAN_WHATSAPP_CONTENT_SID',
      '',
    );
    if (
      mode !== 'live' ||
      !this.client ||
      !/^whatsapp:\+[1-9]\d{7,14}$/.test(sender) ||
      !/^HX[0-9a-fA-F]{32}$/.test(contentSid)
    )
      return {
        state: 'UNCONFIGURED',
        reason:
          'Configure live mode, Twilio credentials, sender and an approved Guardian WhatsApp template.',
      };
    return { state: 'READY' };
  }

  /** A provider acknowledgement is not a delivery receipt. No automatic retries. */
  async sendGuardianReportNotification(
    agencyId: string,
    recipient: string,
    variables: Record<string, string>,
  ): Promise<GuardianWhatsAppResult> {
    const availability = this.guardianWhatsAppAvailability(agencyId);
    if (availability.state === 'UNCONFIGURED')
      return {
        state: 'UNCONFIGURED',
        message: availability.reason!,
      };
    if (availability.state === 'SIMULATED')
      return {
        state: 'SIMULATED',
        message: 'Simulation only. No request was sent to WhatsApp or Twilio.',
      };
    if (!/^\+[1-9]\d{7,14}$/.test(recipient))
      return { state: 'FAILED', message: 'The recipient phone is invalid.' };
    try {
      const result = await this.client.messages.create({
        from: this.configService.get<string>('TWILIO_WHATSAPP_NUMBER'),
        to: `whatsapp:${recipient}`,
        contentSid: this.configService.get<string>(
          'GUARDIAN_WHATSAPP_CONTENT_SID',
        ),
        contentVariables: JSON.stringify(variables),
      });
      const accepted = [
        'accepted',
        'queued',
        'sending',
        'sent',
        'delivered',
        'read',
      ].includes(result.status);
      if (!result.sid || result.errorCode || !accepted)
        return {
          state: 'FAILED',
          message:
            'Twilio did not accept the notification. Check provider configuration and template approval.',
          ...(result.sid ? { providerSid: result.sid } : {}),
          providerStatus: result.status,
          ...(result.errorCode ? { errorCode: result.errorCode } : {}),
        };
      return {
        state: 'PROVIDER_ACCEPTED',
        message:
          'Twilio accepted the request. WhatsApp delivery has not been verified.',
        providerSid: result.sid,
        providerStatus: result.status,
      };
    } catch (error: unknown) {
      const providerError = error as { status?: number; code?: number };
      // Network timeouts may occur after provider acceptance. Never retry them here.
      const acceptanceUnknown = !(
        typeof providerError.status === 'number' &&
        providerError.status >= 400 &&
        providerError.status < 500
      );
      return {
        state: 'FAILED',
        message: acceptanceUnknown
          ? 'The provider request failed; acceptance is unknown. Do not resend automatically.'
          : 'Twilio rejected the request. Check provider configuration and template approval.',
        acceptanceUnknown,
        ...(typeof providerError.code === 'number'
          ? { errorCode: providerError.code }
          : {}),
      };
    }
  }

  async sendWhatsAppMessage(to: string, message: string) {
    const from =
      this.configService.get<string>('TWILIO_WHATSAPP_NUMBER') ||
      'whatsapp:+14155238886';

    // Ensure 'to' number is in WhatsApp format
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

    if (this.client) {
      try {
        this.logger.log(
          `[TWILIO] Sending real WhatsApp message to ${formattedTo}...`,
        );
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
      this.logger.log(
        `[TWILIO MOCK] WhatsApp message to ${formattedTo}: ${message}`,
      );
      return { success: true, status: 'mock_sent', to: formattedTo };
    }
  }
}
