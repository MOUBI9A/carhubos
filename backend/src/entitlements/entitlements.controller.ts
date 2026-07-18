import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';

/**
 * Agency-facing billing/entitlements reads + the public plan catalog.
 * `GET /platform/plans` is intentionally UNGUARDED (public pricing page);
 * `GET /agency/billing` is scoped to the caller's own agency via the JWT.
 */
@Controller()
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly prisma: PrismaService,
  ) {}

  /** The caller agency's plan, status, usage and invoice history. */
  @Get('agency/billing')
  @UseGuards(AuthGuard)
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
