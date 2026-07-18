import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

/** Impersonation tokens are deliberately short-lived. */
const IMPERSONATION_TTL = '30m';

/**
 * Founder support tooling: a ROOT_ADMIN can log into a tenant to help, audited.
 * The impersonation token is a NORMAL auth token (sub/email/role/agencyId so all
 * guards + tenant scoping apply as that user) plus `isImpersonated` +
 * `impersonatorId` claims — used to render a banner and to restore the founder's
 * own session on exit. Impersonating another platform admin is refused.
 */
@Injectable()
export class ForensicService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLogs: AuditLogsService,
  ) {}

  /** Impersonate a specific agency's OWNER (the common support case). */
  async impersonateAgencyOwner(rootAdminId: string, agencyId: string) {
    await this.assertRoot(rootAdminId);
    const owner = await this.prisma.user.findFirst({
      where: { agencyId, role: 'OWNER' },
    });
    if (!owner) {
      throw new NotFoundException('This agency has no owner to impersonate.');
    }
    return this.issue(rootAdminId, owner);
  }

  /** Impersonate a specific user by id. */
  async impersonateUser(rootAdminId: string, targetUserId: string) {
    await this.assertRoot(rootAdminId);
    const target = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!target) throw new NotFoundException('Target user not found.');
    if (target.role === 'ROOT_ADMIN') {
      throw new ForbiddenException('Cannot impersonate a platform admin.');
    }
    return this.issue(rootAdminId, target);
  }

  private async assertRoot(rootAdminId: string) {
    const rootAdmin = await this.prisma.user.findUnique({
      where: { id: rootAdminId },
    });
    if (rootAdmin?.role !== 'ROOT_ADMIN') {
      throw new UnauthorizedException(
        'Forensic access denied: Root Admin only.',
      );
    }
  }

  private async issue(
    rootAdminId: string,
    target: {
      id: string;
      name: string;
      email: string;
      role: string;
      agencyId: string | null;
    },
  ) {
    await this.auditLogs.log(
      target.agencyId || 'ROOT',
      rootAdminId,
      'IMPERSONATE_START',
      'USER',
      target.id,
      null,
      { impersonatedAt: new Date().toISOString() },
    );

    const access_token = await this.jwtService.signAsync(
      {
        sub: target.id,
        email: target.email,
        role: target.role,
        agencyId: target.agencyId,
        isImpersonated: true,
        impersonatorId: rootAdminId,
      },
      { expiresIn: IMPERSONATION_TTL },
    );

    return {
      access_token,
      impersonating: {
        id: target.id,
        name: target.name,
        email: target.email,
        role: target.role,
        agencyId: target.agencyId,
      },
    };
  }
}
