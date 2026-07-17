import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ForensicService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditLogs: AuditLogsService,
  ) {}

  /**
   * Allows Root Admin to generate a temporary, forensic access token for any agency.
   */
  async generateImpersonationToken(rootAdminId: string, targetUserId: string) {
    const rootAdmin = await this.prisma.user.findUnique({
      where: { id: rootAdminId },
    });
    if (rootAdmin?.role !== 'ROOT_ADMIN') {
      throw new UnauthorizedException(
        'Forensic access denied: Root Admin only.',
      );
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) throw new Error('Target user not found.');

    // Log the impersonation event for forensics
    await this.auditLogs.log(
      targetUser.agencyId || 'ROOT',
      rootAdminId,
      'IMPERSONATE_START',
      'USER',
      targetUserId,
      null,
      { impersonatedAt: new Date() },
    );

    return this.jwtService.sign({
      userId: targetUser.id,
      isImpersonated: true,
      rootAdminId: rootAdminId,
    });
  }
}
