import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ForbiddenException } from '@nestjs/common';
import {
  SubscribeWebhookDto,
  isBlockedWebhookHost,
} from './dto/subscribe-webhook.dto';
import { WebhooksController } from './webhooks.controller';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { CAPABILITIES_KEY } from '../common/decorators/require-capabilities.decorator';

/**
 * Boundary + validation coverage for finding #6 (webhooks SSRF). The
 * webhooks module previously had zero specs. Three things are asserted:
 *   1. the SSRF host denylist rejects loopback / link-local / private ranges;
 *   2. the DTO rejects http://, non-URL strings, internal hosts, and bogus
 *      events, and accepts a real public https URL + a real event;
 *   3. every handler is capability-gated on `settings.manage`, and the real
 *      CapabilitiesGuard 403s a caller (e.g. an AGENT) who lacks it.
 */

async function errorsOn(dto: object, property: string): Promise<boolean> {
  const errors = await validate(dto);
  return errors.some((e) => e.property === property);
}

const VALID = {
  url: 'https://hooks.example.com/incoming',
  event: 'BOOKING_CREATED',
};

describe('isBlockedWebhookHost — SSRF denylist', () => {
  it.each([
    ['127.0.0.1', 'loopback 127.0.0.0/8'],
    ['127.255.255.254', 'loopback 127.0.0.0/8'],
    ['10.0.0.1', 'private 10.0.0.0/8'],
    ['172.16.0.1', 'private 172.16.0.0/12 low edge'],
    ['172.31.255.255', 'private 172.16.0.0/12 high edge'],
    ['192.168.1.1', 'private 192.168.0.0/16'],
    ['169.254.169.254', 'link-local / cloud metadata'],
    ['0.0.0.0', '0.0.0.0/8 this-host'],
    ['localhost', 'hostname loopback'],
    ['api.localhost', '.localhost suffix'],
    ['::1', 'IPv6 loopback'],
    ['fc00::1', 'IPv6 unique-local fc00::/7'],
    ['fe80::1', 'IPv6 link-local fe80::/10'],
    ['999.1.1.1', 'malformed octet'],
  ])('blocks %s (%s)', (host) => {
    expect(isBlockedWebhookHost(host)).toBe(true);
  });

  it.each([
    ['example.com'],
    ['hooks.example.com'],
    ['8.8.8.8'],
    ['172.15.0.1'], // just below the 172.16/12 range
    ['172.32.0.1'], // just above the 172.16/12 range
    ['93.184.216.34'],
  ])('allows public host %s', (host) => {
    expect(isBlockedWebhookHost(host)).toBe(false);
  });
});

describe('SubscribeWebhookDto — validation', () => {
  it('rejects an http:// url (https required)', async () => {
    const dto = plainToInstance(SubscribeWebhookDto, {
      ...VALID,
      url: 'http://hooks.example.com/incoming',
    });
    expect(await errorsOn(dto, 'url')).toBe(true);
  });

  it('rejects a non-URL string', async () => {
    const dto = plainToInstance(SubscribeWebhookDto, {
      ...VALID,
      url: 'not-a-url',
    });
    expect(await errorsOn(dto, 'url')).toBe(true);
  });

  it.each([
    'https://169.254.169.254/latest/meta-data/iam/security-credentials/',
    'https://127.0.0.1/hook',
    'https://localhost/hook',
    'https://10.0.0.5/hook',
    'https://192.168.1.10/hook',
    'https://[::1]/hook',
  ])('rejects the internal/loopback target %s', async (url) => {
    const dto = plainToInstance(SubscribeWebhookDto, { ...VALID, url });
    expect(await errorsOn(dto, 'url')).toBe(true);
  });

  it('rejects an event outside the allowlist', async () => {
    const dto = plainToInstance(SubscribeWebhookDto, {
      ...VALID,
      event: 'ARBITRARY_EVENT',
    });
    expect(await errorsOn(dto, 'event')).toBe(true);
  });

  it('accepts a public https url + a real event (with optional secret)', async () => {
    const dto = plainToInstance(SubscribeWebhookDto, {
      url: 'https://hooks.example.com/incoming',
      event: 'BOOKING_STATUS_UPDATED',
      secret: 's3cr3t',
    });
    expect(await validate(dto)).toHaveLength(0);
  });
});

describe('WebhooksController — capability gating (finding #6)', () => {
  it('gates every handler on settings.manage', () => {
    const proto = WebhooksController.prototype;
    for (const name of ['subscribe', 'findAll', 'unsubscribe'] as const) {
      const handler = Object.getOwnPropertyDescriptor(proto, name)?.value;
      expect(Reflect.getMetadata(CAPABILITIES_KEY, handler)).toEqual([
        'settings.manage',
      ]);
    }
  });

  function makeContext(user: any) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as any;
  }
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(['settings.manage']),
  } as any;

  it('403s an AGENT whose membership lacks settings.manage', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          // AGENT preset — no settings.manage
          capabilities: ['fleet.view', 'booking.create', 'booking.manage'],
        }),
      },
    };
    const guard = new CapabilitiesGuard(reflector, prisma as any);
    await expect(
      guard.canActivate(
        makeContext({ id: 'u-agent', agencyId: 'a1', role: 'AGENT' }),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an OWNER whose membership holds settings.manage', async () => {
    const prisma = {
      agencyMembership: {
        findUnique: jest.fn().mockResolvedValue({
          capabilities: ['settings.manage', 'fleet.view'],
        }),
      },
    };
    const guard = new CapabilitiesGuard(reflector, prisma as any);
    await expect(
      guard.canActivate(
        makeContext({ id: 'u-owner', agencyId: 'a1', role: 'OWNER' }),
      ),
    ).resolves.toBe(true);
  });
});
