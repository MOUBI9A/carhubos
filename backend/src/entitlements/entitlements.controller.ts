import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';

/**
 * Agency-facing billing/entitlements reads + the public plan catalog.
 * `GET /platform/plans` is intentionally UNGUARDED (public pricing page);
 * `GET /agency/billing` is scoped to the caller's own agency via the JWT AND
 * gated on `finance.view` (audit 2026-07-26 #6: it was AuthGuard-only, so
 * any authenticated staff member — including a 14-capability AGENT, whose
 * preset excludes finance.view — could read the agency's subscription plan,
 * usage meters, and full PlatformInvoice history). Reuses the existing
 * `finance.view` capability rather than minting a new one — it already has
 * the right role-preset shape (OWNER/MANAGER/Accountant hold it, AGENT and
 * the Front-desk/Fleet-manager staff presets don't).
 */
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  /** The caller agency's plan, status, usage and invoice history. */
  @Get('agency/billing')
  @UseGuards(AuthGuard, CapabilitiesGuard)
  @RequireCapabilities('finance.view')
  billing(@CurrentUser() user: any) {
    return this.entitlements.getBillingSnapshot(user.agencyId);
  }

  /** Public plan catalog for the pricing page (public plans only, BETA hidden). */
  @Get('platform/plans')
  plans() {
    return this.prisma.plan.findMany({
      where: { isPublic: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        key: true,
        name: true,
        description: true,
        priceMonthly: true,
        currency: true,
        maxCars: true,
        maxStaff: true,
        maxBookingsPerMonth: true,
        features: true,
        sortOrder: true,
      },
    });
  }
}
