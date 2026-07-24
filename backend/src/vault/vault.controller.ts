import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VaultService } from './vault.service';
import {
  ListVaultFilesQueryDto,
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from './dto/vault-file.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CapabilitiesGuard } from '../common/guards/capabilities.guard';
import { RequireCapabilities } from '../common/decorators/require-capabilities.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/**
 * Generic tenant-scoped file vault (Supabase Storage-backed). Gated on
 * `settings.manage` for every handler — the vault has no established
 * capability of its own yet and no product decision on who beyond
 * OWNER/MANAGER should read/write it, so this reuses the same
 * agency-wide-config capability `webhooks`/`agencies` settings reuse rather
 * than mint an ungoverned new one. Flagging, not guessing: broadening to
 * MANAGER/AGENT read access is a one-line follow-up once that's decided.
 */
@Controller('vault/files')
@UseGuards(AuthGuard, CapabilitiesGuard)
@RequireCapabilities('settings.manage')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post()
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
  upload(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    return this.vaultService.upload(user.agencyId, user.id, file);
  }

  @Get()
  list(@CurrentUser() user: any, @Query() query: ListVaultFilesQueryDto) {
    return this.vaultService.list(user.agencyId, query);
  }

  @Get(':id/download-url')
  getDownloadUrl(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vaultService.getDownloadUrl(user.agencyId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.vaultService.remove(user.agencyId, id);
  }
}
