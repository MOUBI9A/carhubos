import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RenterGuard } from './guards/renter.guard';
import { PortalService } from './portal.service';
import { ConsentService } from '../consent/consent.service';
import { UsersService } from '../users/users.service';
import { CreateRenterDocumentDto } from './dto/create-renter-document.dto';
import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from '../vault/dto/vault-file.dto';

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
    private readonly usersService: UsersService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: any) {
    return this.portalService.me(user.id);
  }

  /**
   * (Re)issue the caller's own Trust Vault QR bearer token. Previously this
   * was only ever set for the seeded demo renter (seed-roles.js) — no route
   * called `UsersService.generateTrustQr` at all, so a real renter had no way
   * to get one. Returns only `{ qrHash }`: the service's own update result is
   * a full `User` row (includes the password hash), which must never reach
   * the wire.
   */
  @Post('trust-qr')
  async issueTrustQr(@CurrentUser() user: any) {
    const updated = await this.usersService.generateTrustQr(user.id);
    return { qrHash: updated.qrHash };
  }

  @Get('documents')
  documents(@CurrentUser() user: any) {
    return this.portalService.documents(user.id);
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: VAULT_MAX_FILE_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (!VAULT_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
          cb(
            new BadRequestException(
              `Unsupported file type "${file.mimetype}". Allowed: ${VAULT_ALLOWED_MIME_TYPES.join(', ')}.`,
            ),
            false,
          );
          return;
        }
        cb(null, true);
      },
    }),
  )
  uploadDocument(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateRenterDocumentDto,
  ) {
    return this.portalService.createDocument(user.id, dto, file);
  }

  @Get('documents/:id/download-url')
  getDocumentDownloadUrl(@CurrentUser() user: any, @Param('id') id: string) {
    return this.portalService.getDocumentDownloadUrl(user.id, id);
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
