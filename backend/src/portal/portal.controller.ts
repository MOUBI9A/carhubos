import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RenterGuard } from './guards/renter.guard';
import { PortalService } from './portal.service';
import { ConsentService } from '../consent/consent.service';

/**
 * Renter self-service portal. `AuthGuard` authenticates; `RenterGuard` restricts
 * to the RENTER identity (or ROOT_ADMIN). Every handler passes ONLY the caller's
 * own `user.id` down — no handler accepts a caller-supplied user/agency id — so
 * these endpoints are self-only by construction.
 */
@Controller('portal')
@UseGuards(AuthGuard, RenterGuard)
export class PortalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly consentService: ConsentService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return this.portalService.me(user.id);
  }

  @Get('documents')
  documents(@CurrentUser() user: any) {
    return this.portalService.documents(user.id);
  }

  @Get('bookings')
  bookings(@CurrentUser() user: any) {
    return this.portalService.bookings(user.id);
  }

  @Get('notifications')
  notifications(@CurrentUser() user: any) {
    return this.portalService.notifications(user.id);
  }

  @Patch('notifications/:id/read')
  markNotificationRead(@CurrentUser() user: any, @Param('id') id: string) {
    return this.portalService.markNotificationRead(user.id, id);
  }

  @Get('consent')
  listConsent(@CurrentUser() user: any) {
    return this.consentService.listForRenter(user.id);
  }

  @Post('consent/:id/approve')
  approveConsent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.consentService.approve(user.id, id);
  }

  @Post('consent/:id/revoke')
  revokeConsent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.consentService.revoke(user.id, id);
  }
}
