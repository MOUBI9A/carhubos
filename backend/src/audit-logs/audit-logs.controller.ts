import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Agency audit trail — read-only, but it exposes sensitive oversight (price
 * changes, staff-management, blacklist actions). That's a management-level
 * concern, so it's restricted to OWNER/MANAGER (+ ROOT_ADMIN) via role rather
 * than a granular capability (no fitting existing capability, and a new one would
 * need a re-seed). This closes finding #13's gap where the previous bare
 * `@UseGuards(AuthGuard)` let any authenticated agency user — incl. AGENT and
 * even a RENTER portal account — read the whole trail.
 */
@Controller('audit-logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('OWNER', 'MANAGER', 'ROOT_ADMIN')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.auditLogsService.findAll(user.agencyId);
  }
}
