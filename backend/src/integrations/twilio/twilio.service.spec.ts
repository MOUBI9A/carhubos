import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';
import { TwilioService } from './twilio.service';

jest.mock('twilio', () => ({ Twilio: jest.fn() }));

function setup(overrides: Record<string, string | undefined> = {}) {
  const create = jest.fn();
  (Twilio as unknown as jest.Mock).mockImplementation(() => ({
    messages: { create },
  }));
  const config: Record<string, string | undefined> = {
    TWILIO_ACCOUNT_SID: 'AC' + 'a'.repeat(32),
    TWILIO_AUTH_TOKEN: 'test-only-token',
    TWILIO_WHATSAPP_NUMBER: 'whatsapp:+212522000000',
    GUARDIAN_WHATSAPP_AGENCY_IDS: 'agency-1,agency-2',
    GUARDIAN_WHATSAPP_MODE: 'live',
    GUARDIAN_WHATSAPP_CONTENT_SID: 'HX' + 'b'.repeat(32),
    ...overrides,
  };
  const service = new TwilioService({
    get: (key: string, fallback?: string) => config[key] ?? fallback,
  } as ConfigService);
  return { service, create };
}

describe('Twilio Guardian controlled notification delivery states', () => {
  beforeEach(() => jest.clearAllMocks());

  it.each([
    { TWILIO_ACCOUNT_SID: undefined },
    { TWILIO_WHATSAPP_NUMBER: undefined },
    { GUARDIAN_WHATSAPP_CONTENT_SID: undefined },
    { GUARDIAN_WHATSAPP_MODE: undefined },
    { GUARDIAN_WHATSAPP_AGENCY_IDS: undefined },
  ])(
    'returns UNCONFIGURED without sending when configuration is incomplete',
    async (overrides) => {
      const { service, create } = setup(overrides);
      expect(
        (
          await service.sendGuardianReportNotification(
            'agency-1',
            '+212612345678',
            {},
          )
        ).state,
      ).toBe('UNCONFIGURED');
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('does not send for a foreign or non-opted-in agency', async () => {
    const { service, create } = setup();
    expect(
      (
        await service.sendGuardianReportNotification(
          'foreign',
          '+212612345678',
          {},
        )
      ).state,
    ).toBe('UNCONFIGURED');
    expect(create).not.toHaveBeenCalled();
  });

  it('returns SIMULATED distinctly without contacting the provider', async () => {
    const { service, create } = setup({
      GUARDIAN_WHATSAPP_MODE: 'simulated',
      TWILIO_ACCOUNT_SID: undefined,
    });
    expect(
      await service.sendGuardianReportNotification(
        'agency-1',
        '+212612345678',
        {},
      ),
    ).toEqual({
      state: 'SIMULATED',
      message: expect.stringContaining('No request'),
    });
    expect(create).not.toHaveBeenCalled();
  });

  it('uses the configured approved template and calls a queued API response provider-accepted only', async () => {
    const { service, create } = setup();
    create.mockResolvedValue({
      sid: 'SM-test',
      status: 'queued',
      errorCode: null,
    });
    expect(
      await service.sendGuardianReportNotification(
        'agency-1',
        '+212612345678',
        { '1': 'test' },
      ),
    ).toEqual({
      state: 'PROVIDER_ACCEPTED',
      message: expect.stringContaining('delivery has not been verified'),
      providerSid: 'SM-test',
      providerStatus: 'queued',
    });
    expect(create).toHaveBeenCalledWith({
      from: 'whatsapp:+212522000000',
      to: 'whatsapp:+212612345678',
      contentSid: 'HX' + 'b'.repeat(32),
      contentVariables: '{"1":"test"}',
    });
    expect(Twilio).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { timeout: 10000, autoRetry: false },
    );
  });

  it.each(['failed', 'undelivered', 'canceled', 'received', 'unknown'])(
    'does not claim provider acceptance for %s',
    async (status) => {
      const { service, create } = setup();
      create.mockResolvedValue({ sid: 'SM-test', status, errorCode: null });
      expect(
        (
          await service.sendGuardianReportNotification(
            'agency-1',
            '+212612345678',
            {},
          )
        ).state,
      ).toBe('FAILED');
    },
  );

  it('rejects a returned error even if the status says queued', async () => {
    const { service, create } = setup();
    create.mockResolvedValue({
      sid: 'SM-test',
      status: 'queued',
      errorCode: 63016,
    });
    expect(
      await service.sendGuardianReportNotification(
        'agency-1',
        '+212612345678',
        {},
      ),
    ).toMatchObject({ state: 'FAILED', errorCode: 63016 });
  });

  it('reports provider rejection without leaking raw provider errors or recipient content', async () => {
    const { service, create } = setup();
    create.mockRejectedValue({
      status: 400,
      code: 63016,
      message: 'secret token or recipient body',
    });
    const result = await service.sendGuardianReportNotification(
      'agency-1',
      '+212612345678',
      {},
    );
    expect(result).toMatchObject({
      state: 'FAILED',
      acceptanceUnknown: false,
      errorCode: 63016,
    });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('reports timeouts as failed with unknown acceptance and never retries', async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new Error('timeout'));
    expect(
      await service.sendGuardianReportNotification(
        'agency-1',
        '+212612345678',
        {},
      ),
    ).toMatchObject({ state: 'FAILED', acceptanceUnknown: true });
    expect(create).toHaveBeenCalledTimes(1);
  });
});
