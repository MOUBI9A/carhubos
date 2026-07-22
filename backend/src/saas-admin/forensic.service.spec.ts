import {
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ForensicService } from './forensic.service';

/**
 * Coverage for MASTER_BACKLOG §4's highest-ranked untested surface: ROOT_ADMIN
 * impersonation. The whole `SaasAdminController` is already class-level
 * `@Roles('ROOT_ADMIN')`-gated (defense in depth, not this file's job to
 * re-prove), so what matters here is `ForensicService`'s own internal guard —
 * every entry point re-checks the caller is ROOT_ADMIN itself, rather than
 * trusting the HTTP layer alone — plus the can't-impersonate-a-platform-admin
 * rule and the shape of the minted token (audited, short TTL, restorable).
 */
function makeService({
  callerRole,
  target,
  auditLog = jest.fn(),
  signAsync = jest.fn().mockResolvedValue('signed.jwt.token'),
}: {
  callerRole: string | undefined;
  target?: Record<string, any> | null;
  auditLog?: jest.Mock;
  signAsync?: jest.Mock;
}) {
  const caller = callerRole ? { id: 'caller-1', role: callerRole } : null;
  const prisma = {
    user: {
      findUnique: jest.fn((args: any) => {
        if (args.where.id === 'caller-1') return Promise.resolve(caller);
        if (args.where.id === 'target-1') return Promise.resolve(target ?? null);
        return Promise.resolve(null);
      }),
      findFirst: jest.fn((args: any) => {
        // impersonateAgencyOwner's lookup: { agencyId, role: 'OWNER' }
        if (target && target.agencyId === args.where.agencyId && args.where.role === 'OWNER') {
          return Promise.resolve(target);
        }
        return Promise.resolve(null);
      }),
    },
  };
  const jwtService = { signAsync };
  const auditLogs = { log: auditLog };
  const svc = new ForensicService(prisma as any, jwtService as any, auditLogs as any);
  return { svc, signAsync, auditLog, prisma };
}

const OWNER_TARGET = {
  id: 'target-1',
  name: 'Agency Owner',
  email: 'owner@target.ma',
  role: 'OWNER',
  agencyId: 'agency-x',
};

describe('ForensicService.impersonateAgencyOwner', () => {
  it('rejects a non-ROOT_ADMIN caller before looking up any target', async () => {
    const { svc, prisma } = makeService({ callerRole: 'OWNER' });

    await expect(
      svc.impersonateAgencyOwner('caller-1', 'agency-x'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });

  it('rejects when the caller id resolves to no user at all', async () => {
    const { svc } = makeService({ callerRole: undefined });

    await expect(
      svc.impersonateAgencyOwner('caller-1', 'agency-x'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('404s when the target agency has no OWNER', async () => {
    const { svc } = makeService({ callerRole: 'ROOT_ADMIN', target: null });

    await expect(
      svc.impersonateAgencyOwner('caller-1', 'agency-x'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mints a token with the target owner\'s own claims + impersonation metadata, and audits it', async () => {
    const { svc, signAsync, auditLog } = makeService({
      callerRole: 'ROOT_ADMIN',
      target: OWNER_TARGET,
    });

    const result = await svc.impersonateAgencyOwner('caller-1', 'agency-x');

    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        sub: 'target-1',
        email: 'owner@target.ma',
        role: 'OWNER',
        agencyId: 'agency-x',
        isImpersonated: true,
        impersonatorId: 'caller-1',
      }),
      { expiresIn: '30m' },
    );
    expect(result.access_token).toBe('signed.jwt.token');
    expect(result.impersonating).toEqual({
      id: 'target-1',
      name: 'Agency Owner',
      email: 'owner@target.ma',
      role: 'OWNER',
      agencyId: 'agency-x',
    });
    expect(auditLog).toHaveBeenCalledWith(
      'agency-x',
      'caller-1',
      'IMPERSONATE_START',
      'USER',
      'target-1',
      null,
      expect.any(Object),
    );
  });
});

describe('ForensicService.impersonateUser', () => {
  it('rejects a non-ROOT_ADMIN caller', async () => {
    const { svc, prisma } = makeService({ callerRole: 'MANAGER', target: OWNER_TARGET });

    await expect(
      svc.impersonateUser('caller-1', 'target-1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    // Only the caller lookup should have happened — never resolved the target.
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it('404s an unknown target id', async () => {
    const { svc } = makeService({ callerRole: 'ROOT_ADMIN', target: null });

    await expect(
      svc.impersonateUser('caller-1', 'target-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses to impersonate another platform admin (privilege-escalation guard)', async () => {
    const { svc, signAsync } = makeService({
      callerRole: 'ROOT_ADMIN',
      target: { ...OWNER_TARGET, role: 'ROOT_ADMIN' },
    });

    await expect(
      svc.impersonateUser('caller-1', 'target-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(signAsync).not.toHaveBeenCalled();
  });

  it('mints a token for an ordinary target user and audits it under their agency', async () => {
    const { svc, signAsync, auditLog } = makeService({
      callerRole: 'ROOT_ADMIN',
      target: { ...OWNER_TARGET, role: 'AGENT' },
    });

    const result = await svc.impersonateUser('caller-1', 'target-1');

    expect(signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 'target-1', role: 'AGENT', impersonatorId: 'caller-1' }),
      { expiresIn: '30m' },
    );
    expect(auditLog).toHaveBeenCalledWith(
      'agency-x',
      'caller-1',
      'IMPERSONATE_START',
      'USER',
      'target-1',
      null,
      expect.any(Object),
    );
    expect(result.impersonating.role).toBe('AGENT');
  });

  it('audits under \'ROOT\' when the target has no agency (a ROOT_ADMIN target — unreachable via the Forbidden guard, but the null-agency fallback is real logic worth pinning)', async () => {
    const { svc, auditLog } = makeService({
      callerRole: 'ROOT_ADMIN',
      target: { ...OWNER_TARGET, agencyId: null, role: 'RENTER' },
    });

    await svc.impersonateUser('caller-1', 'target-1');

    expect(auditLog).toHaveBeenCalledWith(
      'ROOT',
      'caller-1',
      'IMPERSONATE_START',
      'USER',
      'target-1',
      null,
      expect.any(Object),
    );
  });
});
