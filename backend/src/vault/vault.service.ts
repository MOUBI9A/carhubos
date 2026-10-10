import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from './vault-storage.service';
import {
  ListVaultFilesQueryDto,
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from './dto/vault-file.dto';

/** Strips anything that isn't safe in a storage-object key/path segment. */
function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
  return cleaned || 'file';
}

/**
 * Validate a small set of trusted document/image formats using their file
 * signatures. Multipart MIME metadata is supplied by the client and is not a
 * security boundary by itself.
 */
function matchesDeclaredMimeType(mimeType: string, buffer: Buffer): boolean {
  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  if (mimeType === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === 'image/png') {
    const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    return buffer.length >= pngSignature.length && buffer.subarray(0, 8).equals(pngSignature);
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  return false;
}

/**
 * Vault — generic tenant-scoped file storage. Every method takes the
 * caller's agencyId from the JWT (never the body/param) and every read/write
 * re-checks it, so a cross-tenant id resolves to 404, never a leak (CLAUDE.md
 * §5.1). The bytes live in a private Supabase bucket
 * (`vault-storage.service.ts`); this service owns validation, tenant
 * scoping, and the metadata row.
 */
@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: VaultStorageService,
  ) {}

  async upload(
    agencyId: string,
    uploadedById: string,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    if (!VAULT_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${VAULT_ALLOWED_MIME_TYPES.join(', ')}.`,
      );
    }
    if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`,
      );
    }
    if (!file.buffer?.length || !matchesDeclaredMimeType(file.mimetype, file.buffer)) {
      throw new BadRequestException(
        'File content does not match its declared MIME type.',
      );
    }

    const storagePath = `${agencyId}/${randomUUID()}-${sanitizeFilename(file.originalname)}`;

    await this.storage.upload(storagePath, file.buffer, file.mimetype);

    try {
      return await this.prisma.vaultFile.create({
        data: {
          filename: file.originalname,
          storagePath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          agencyId,
          uploadedById,
        },
      });
    } catch (err) {
      this.logger.error(
        `Metadata insert failed after a successful upload for ${storagePath}; cleaning up. ${(err as Error).message}`,
      );
      await this.storage.remove(storagePath);
      throw err;
    }
  }

  async list(agencyId: string, query: ListVaultFilesQueryDto) {
    const where = {
      agencyId,
      ...(query.search
        ? { filename: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    if (!query.page && !query.limit) {
      return this.prisma.vaultFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [items, total] = await Promise.all([
      this.prisma.vaultFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vaultFile.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  private async findOwned(agencyId: string, id: string) {
    const file = await this.prisma.vaultFile.findFirst({
      where: { id, agencyId },
    });
    if (!file) {
      throw new NotFoundException('File not found.');
    }
    return file;
  }

  async getDownloadUrl(agencyId: string, id: string) {
    const file = await this.findOwned(agencyId, id);
    const url = await this.storage.createSignedUrl(file.storagePath);
    return { url, filename: file.filename, expiresInSeconds: 300 };
  }

  async remove(agencyId: string, id: string) {
    const file = await this.findOwned(agencyId, id);
    await this.storage.remove(file.storagePath);
    await this.prisma.vaultFile.delete({ where: { id: file.id } });
    return { id: file.id, deleted: true };
  }
}
