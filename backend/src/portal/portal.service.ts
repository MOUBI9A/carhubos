import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';
import { TrustService } from '../trust/trust.service';
import {
  VAULT_ALLOWED_MIME_TYPES,
  VAULT_MAX_FILE_SIZE_BYTES,
} from '../vault/dto/vault-file.dto';
import { CreateRenterDocumentDto } from './dto/create-renter-document.dto';
import { VerifyIdentityDto } from './dto/verify-identity.dto';

/** Strips anything unsafe in a storage-object key/path segment. */
function sanitizeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'file';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 150);
  return cleaned || 'file';
}

/**
 * Renter self-service reads. EVERY method is keyed on the caller's own `userId`
 * (from the JWT, passed by the controller) — never a body/param id — so a
 * renter can only ever reach their own profile, bookings and notifications.
 */
@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultStorage: VaultStorageService,
    private readonly trust: TrustService,
  ) {}

  /** The renter's profile + their global trust summary (if identity-linked). */
  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        trustScore: true,
        isVerified: true,
        qrHash: true,
        createdAt: true,
        renterIdentityId: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    let trustSummary:
      | { linked: false; message: string }
      | {
          linked: true;
          globalScore: number;
          reviewCount: number;
          riskLevel: string;
        } = { linked: false, message: 'no network history' };

    if (user.renterIdentityId) {
      const identity = await this.prisma.renterIdentity.findUnique({
        where: { id: user.renterIdentityId },
        select: { globalScore: true, reviewCount: true, riskLevel: true },
      });
      if (identity) {
        trustSummary = { linked: true, ...identity };
      }
    }

    return { ...user, trustSummary };
  }

  /**
   * The renter's OWN document vault (RenterDocument), self-scoped on the
   * caller's `userId`. This is the owner reading their own documents, so it
   * needs NO consent grant — the consent gate governs AGENCY reads of this same
   * vault (see ConsentService.readDocuments), not the owner's own view.
   */
  async documents(userId: string) {
    return this.prisma.renterDocument.findMany({
      where: { ownerUserId: userId },
      select: {
        id: true,
        type: true,
        label: true,
        fileUrl: true,
        storagePath: true,
        mimeType: true,
        sizeBytes: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Upload a real file into the renter's own identity-document vault. Reuses
   * VaultStorageService (same Supabase bucket/mechanics as the agency Vault)
   * but deliberately does NOT create a VaultFile row — VaultFile.agencyId is
   * required (single-tenant), and RenterDocument is cross-tenant by design
   * (owned by the renter, read by many agencies via ConsentGrant — see
   * ConsentService.readDocuments). storagePath is namespaced under the
   * renter's own userId, not any agency, keeping it out of every
   * agency-scoped Vault query entirely.
   */
  async createDocument(
    userId: string,
    dto: CreateRenterDocumentDto,
    file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException('No file provided.');
    }
    // Defense in depth — the controller's FileInterceptor already enforces
    // this via multer's fileFilter/limits, but a single validation layer is
    // never the actual security boundary.
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

    const storagePath = `renter-documents/${userId}/${randomUUID()}-${sanitizeFilename(file.originalname)}`;
    await this.vaultStorage.upload(storagePath, file.buffer, file.mimetype);

    try {
      return await this.prisma.renterDocument.create({
        data: {
          type: dto.type,
          label: dto.label ?? null,
          storagePath,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          ownerUserId: userId,
        },
      });
    } catch (err) {
      this.logger.error(
        `Metadata insert failed after a successful upload for ${storagePath}; cleaning up. ${(err as Error).message}`,
      );
      await this.vaultStorage.remove(storagePath);
      throw err;
    }
  }

  /** Self-serve signed download URL for the renter's OWN document. */
  async getDocumentDownloadUrl(userId: string, documentId: string) {
    const doc = await this.prisma.renterDocument.findFirst({
      where: { id: documentId, ownerUserId: userId },
      select: { storagePath: true, label: true, type: true },
    });
    if (!doc || !doc.storagePath) {
      throw new NotFoundException('Document not found.');
    }
    const url = await this.vaultStorage.createSignedUrl(doc.storagePath);
    return { url, expiresInSeconds: 300 };
  }

  /** The renter's bookings, newest first, with car + status + dates + price. */
  async bookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { renterId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        totalPrice: true,
        createdAt: true,
        car: {
          select: {
            id: true,
            brand: true,
            model: true,
            year: true,
            licensePlate: true,
          },
        },
      },
    });
  }

  /** The renter's notifications, newest first. */
  async notifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Mark one of the renter's notifications read. The WHERE carries `userId`, so
   * another user's notification is simply not matched (count 0 → 404) — a
   * cross-user write is impossible.
   */
  async markNotificationRead(userId: string, notificationId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });
    if (res.count === 0) {
      throw new NotFoundException('Notification not found.');
    }
    return { id: notificationId, read: true };
  }

  /**
   * Renter submits their identity (and optionally phone) to link their
   * portal account to the global RenterIdentity, then claims any Customer
   * rows — across any agency — that resolve to the same person and aren't
   * linked to a portal account yet. Self-scoped: only ever touches the
   * caller's own userId.
   */
  async verifyIdentity(userId: string, dto: VerifyIdentityDto) {
    const identity = await this.trust.resolveIdentityForRenterUser(
      userId,
      dto.identityType,
      dto.identityNumber,
    );
    const linkedAgencies = await this.trust.linkCustomersToRenter(
      userId,
      identity.id,
      dto.phone,
    );
    return { renterIdentityId: identity.id, linkedAgencies };
  }

  /**
   * Consume a staff-issued invite, linking the target Customer row to the
   * caller's own account. The token IS the authorization — it's random,
   * single-use and expiring (see CustomersService.createInvite, which is
   * the only place one is minted, tenant-scoped there) — this endpoint
   * never accepts a customerId directly, only the opaque token, so it can't
   * be used to link an arbitrary Customer row.
   */
  async claimInvite(userId: string, token: string) {
    const invite = await this.prisma.customerInvite.findUnique({
      where: { token },
      include: {
        customer: {
          select: {
            id: true,
            userId: true,
            agencyId: true,
            agency: { select: { name: true } },
          },
        },
      },
    });
    if (!invite || invite.consumedAt || invite.expiresAt < new Date()) {
      throw new NotFoundException('Invite not found or expired.');
    }
    if (invite.customer.userId && invite.customer.userId !== userId) {
      throw new ConflictException(
        'This client record is already linked to a different account.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.customer.update({
        where: { id: invite.customerId },
        data: { userId },
      }),
      this.prisma.customerInvite.update({
        where: { id: invite.id },
        data: { consumedAt: new Date(), consumedByUserId: userId },
      }),
    ]);

    return {
      agencyId: invite.customer.agencyId,
      agencyName: invite.customer.agency.name,
    };
  }
}
