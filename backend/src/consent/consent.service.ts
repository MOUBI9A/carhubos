import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';
import { RequestConsentDto } from './dto/consent.dto';

/** Default consent window applied on approval. */
const APPROVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Consent subsystem. THE INVARIANT (see {@link readDocuments}): an agency may
 * read a renter's identity documents ONLY through an ACTIVE grant — status
 * APPROVED, not revoked, `expiresAt` in the future — that is stamped with THAT
 * agency's id and THAT renter as grantor, covering the requested scope.
 *
 * Tenant scope: every agency-facing method is keyed on the caller's `agencyId`
 * (passed from the JWT by the controller), never on a body/param value, so a
 * caller can only ever create/read grants inside their own agency.
 *
 * Self scope: renter-facing methods (approve/revoke/list) are keyed on the
 * grantor's own `userId` (from the JWT) — a non-grantor gets a 404, never a
 * cross-user mutation.
 */
@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultStorage: VaultStorageService,
  ) {}

  private normalizeScope(scope: string[]): string[] {
    return [...new Set(scope)].sort();
  }

  private sameScope(a: string[], b: string[]): boolean {
    const x = this.normalizeScope(a);
    const y = this.normalizeScope(b);
    return x.length === y.length && x.every((v, i) => v === y[i]);
  }

  /**
   * Agency staff request access to a renter's documents.
   * Resolves the renter from `qrHash` or `renterUserId`, stamps the grant with
   * the CALLER's `agencyId` + `requestedByUserId`, and notifies the renter.
   * Idempotent-ish: a duplicate of a still-live (PENDING or ACTIVE) grant with
   * the same scope is rejected.
   */
  async requestGrant(
    agencyId: string,
    requesterId: string,
    dto: RequestConsentDto,
  ) {
    if (!dto.renterUserId && !dto.qrHash) {
      throw new BadRequestException('Provide renterUserId or qrHash.');
    }

    const renter = dto.qrHash
      ? await this.prisma.user.findUnique({ where: { qrHash: dto.qrHash } })
      : await this.prisma.user.findUnique({
          where: { id: dto.renterUserId },
        });

    // Only a RENTER identity can be a grantor. Anything else (or not found)
    // surfaces as 404 — never confirm the existence of a non-renter account.
    if (!renter || renter.role !== 'RENTER') {
      throw new NotFoundException('Renter not found.');
    }

    const scope = this.normalizeScope(dto.scope);
    const now = new Date();

    const live = await this.prisma.consentGrant.findMany({
      where: {
        agencyId,
        grantorUserId: renter.id,
        OR: [
          { status: 'PENDING' },
          { status: 'APPROVED', revokedAt: null, expiresAt: { gt: now } },
        ],
      },
    });
    if (live.some((g) => this.sameScope(g.scope, scope))) {
      throw new ConflictException(
        'A matching consent request already exists.',
      );
    }

    const grant = await this.prisma.consentGrant.create({
      data: {
        grantorUserId: renter.id,
        agencyId,
        requestedByUserId: requesterId,
        scope,
        status: 'PENDING',
      },
    });

    const agency = await this.prisma.agency.findUnique({
      where: { id: agencyId },
      select: { name: true },
    });

    await this.prisma.notification.create({
      data: {
        userId: renter.id,
        type: 'CONSENT_REQUESTED',
        title: `${agency?.name ?? 'An agency'} requests access to your documents`,
        body: `Requested document access: ${scope.join(', ')}.`,
        relatedType: 'ConsentGrant',
        relatedId: grant.id,
      },
    });

    return grant;
  }

  /**
   * THE INVARIANT — the single enforcement point for agency document reads.
   *
   * An active grant MUST exist for {this agency, this renter} with status
   * APPROVED, `revokedAt: null`, `expiresAt > now`. No such grant → 403 and
   * nothing is read. Documents are then filtered to `grant.scope` at the query
   * level, so out-of-scope document types are never even loaded — no PII can
   * leak outside the consented scope.
   */
  async readDocuments(agencyId: string, renterUserId: string) {
    const now = new Date();

    const grant = await this.prisma.consentGrant.findFirst({
      where: {
        agencyId,
        grantorUserId: renterUserId,
        status: 'APPROVED',
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { approvedAt: 'desc' },
    });

    if (!grant) {
      throw new ForbiddenException('No active consent grant');
    }

    // Read the renter's OWN global identity vault (RenterDocument), NOT the
    // agency's own Customer/CustomerDocument paperwork. This vault is the store
    // consent governs: reaching it REQUIRES the active grant proven above. Only
    // the in-scope document types are loaded — the scope filter is pushed into
    // the DB query, so out-of-scope types never leave the database.
    const documents = await this.prisma.renterDocument.findMany({
      where: { ownerUserId: renterUserId, type: { in: grant.scope } },
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

    return {
      grantId: grant.id,
      scope: grant.scope,
      expiresAt: grant.expiresAt,
      documents,
    };
  }

  /**
   * Signed download URL for ONE of a renter's documents, gated on the exact
   * same active-grant + in-scope check as readDocuments — re-verified here,
   * not inherited from a prior call, since this is a separate request that
   * could arrive well after the grant expired or was revoked. A document
   * outside the grant's scope, or with no real uploaded file yet
   * (storagePath null — only a legacy fileUrl, or nothing), 404s rather than
   * ever reaching VaultStorageService.
   */
  async getConsentedDocumentDownloadUrl(
    agencyId: string,
    renterUserId: string,
    documentId: string,
  ) {
    const now = new Date();
    const grant = await this.prisma.consentGrant.findFirst({
      where: {
        agencyId,
        grantorUserId: renterUserId,
        status: 'APPROVED',
        revokedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { approvedAt: 'desc' },
    });
    if (!grant) {
      throw new ForbiddenException('No active consent grant');
    }

    const doc = await this.prisma.renterDocument.findFirst({
      where: {
        id: documentId,
        ownerUserId: renterUserId,
        type: { in: grant.scope },
      },
      select: { storagePath: true },
    });
    if (!doc || !doc.storagePath) {
      throw new NotFoundException('Document not found.');
    }

    const url = await this.vaultStorage.createSignedUrl(doc.storagePath);
    return { url, expiresInSeconds: 300 };
  }

  /** A renter's own grants (pending + active + past), with agency name. */
  async listForRenter(renterUserId: string) {
    const grants = await this.prisma.consentGrant.findMany({
      where: { grantorUserId: renterUserId },
      include: { agency: { select: { id: true, name: true } } },
      orderBy: { requestedAt: 'desc' },
    });
    return grants.map((g) => ({
      id: g.id,
      status: g.status,
      scope: g.scope,
      agencyId: g.agencyId,
      agencyName: g.agency?.name ?? null,
      note: g.note,
      requestedAt: g.requestedAt,
      approvedAt: g.approvedAt,
      revokedAt: g.revokedAt,
      expiresAt: g.expiresAt,
    }));
  }

  /**
   * Renter approves one of THEIR pending grants. Ownership check doubles as
   * existence hiding: a non-grantor (or unknown id) gets 404. Sets APPROVED +
   * approvedAt + a 7-day expiry, then notifies the requesting staff member.
   */
  async approve(renterUserId: string, grantId: string) {
    const grant = await this.prisma.consentGrant.findUnique({
      where: { id: grantId },
    });
    if (!grant || grant.grantorUserId !== renterUserId) {
      throw new NotFoundException('Consent grant not found.');
    }
    if (grant.status !== 'PENDING') {
      throw new ConflictException('Only a pending grant can be approved.');
    }

    const now = new Date();
    const updated = await this.prisma.consentGrant.update({
      where: { id: grantId },
      data: {
        status: 'APPROVED',
        approvedAt: now,
        expiresAt: new Date(now.getTime() + APPROVAL_WINDOW_MS),
        revokedAt: null,
      },
    });

    await this.notifyRequester(
      updated,
      'CONSENT_APPROVED',
      'Consent approved',
      'The renter approved your document access request.',
    );

    return updated;
  }

  /**
   * Renter revokes one of THEIR grants (from PENDING or APPROVED). Ownership
   * check → 404 for a non-grantor. Sets REVOKED + revokedAt.
   */
  async revoke(renterUserId: string, grantId: string) {
    const grant = await this.prisma.consentGrant.findUnique({
      where: { id: grantId },
    });
    if (!grant || grant.grantorUserId !== renterUserId) {
      throw new NotFoundException('Consent grant not found.');
    }
    if (grant.status !== 'PENDING' && grant.status !== 'APPROVED') {
      throw new ConflictException(
        'Only a pending or approved grant can be revoked.',
      );
    }

    const updated = await this.prisma.consentGrant.update({
      where: { id: grantId },
      data: { status: 'REVOKED', revokedAt: new Date() },
    });

    await this.notifyRequester(
      updated,
      'CONSENT_REVOKED',
      'Consent revoked',
      'The renter revoked your document access.',
    );

    return updated;
  }

  /** Notify the agency staff member who requested the grant (if recorded). */
  private async notifyRequester(
    grant: { id: string; requestedByUserId: string | null },
    type: string,
    title: string,
    body: string,
  ) {
    if (!grant.requestedByUserId) return;
    await this.prisma.notification.create({
      data: {
        userId: grant.requestedByUserId,
        type,
        title,
        body,
        relatedType: 'ConsentGrant',
        relatedId: grant.id,
      },
    });
  }

  /**
   * Belt-and-suspenders expiry sweep: flip APPROVED grants whose window has
   * passed to EXPIRED. Reads already exclude them (`expiresAt > now`), so this
   * only keeps stored status honest for listings/audits.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireDueGrants(): Promise<number> {
    const now = new Date();
    const res = await this.prisma.consentGrant.updateMany({
      where: { status: 'APPROVED', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' },
    });
    if (res.count > 0) {
      this.logger.log(
        `Expired ${res.count} consent grant(s) past their window.`,
      );
    }
    return res.count;
  }
}
