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

const ALLOWED_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
};

const DANGEROUS_EXTENSIONS = [
  '.exe',
  '.sh',
  '.php',
  '.html',
  '.htm',
  '.svg',
  '.bat',
  '.cmd',
  '.js',
  '.vbs',
  '.py',
];

function validateFileExtension(filename: string, mimetype: string): boolean {
  const lower = filename.toLowerCase();
  // 1. Strictly reject executable, script, SVG, or HTML extensions
  if (DANGEROUS_EXTENSIONS.some((ext) => lower.endsWith(ext) || lower.includes(`${ext}.`))) {
    return false;
  }
  const allowed = ALLOWED_EXTENSIONS_BY_MIME[mimetype];
  if (!allowed) return false;

  // 2. If an extension exists on the basename, verify it matches the claimed MIME type
  const baseName = filename.split(/[/\\]/).pop() || filename;
  const lastDot = baseName.lastIndexOf('.');
  if (lastDot !== -1) {
    const ext = baseName.slice(lastDot).toLowerCase();
    return allowed.includes(ext);
  }
  return true;
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
    // Defense in depth: the controller's FileInterceptor already enforces
    // this via multer's fileFilter/limits, but a single validation layer is
    // never the actual security boundary — re-check here too.
    if (!VAULT_ALLOWED_MIME_TYPES.includes(file.mimetype as any)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: ${VAULT_ALLOWED_MIME_TYPES.join(', ')}.`,
      );
    }
    if (!validateFileExtension(file.originalname, file.mimetype)) {
      throw new BadRequestException(
        `File extension does not match claimed MIME type "${file.mimetype}".`,
      );
    }
    if (file.size > VAULT_MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${VAULT_MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB limit.`,
      );
    }

    // Tenant-namespaced path: an extra isolation layer at the bucket level,
    // on top of (not instead of) the DB-level agencyId check every read/write
    // below performs.
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
      // The object is already in the bucket but we couldn't record it — clean
      // up rather than leave an orphaned, un-tracked (and unreachable, since
      // nothing references storagePath) object behind.
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

    // No page/limit → bare array, capped, backward-compatible with a simple
    // "give me everything" call. Either present → paginated envelope. Same
    // shape as ListCustomersQueryDto — never fully unbounded either way.
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
