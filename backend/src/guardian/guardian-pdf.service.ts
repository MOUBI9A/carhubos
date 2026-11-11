import {
  Injectable,
  Optional,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Browser } from 'puppeteer';
import { PrismaService } from '../prisma/prisma.service';
import { VaultStorageService } from '../vault/vault-storage.service';

// Select only fields allowed in the downloaded report. In particular, object
// storage paths, account identities and signed URLs never reach the renderer.
const reportSelect = Prisma.validator<Prisma.GuardianReportSelect>()({
  id: true,
  agencyId: true,
  bookingId: true,
  carId: true,
  phase: true,
  mode: true,
  status: true,
  revision: true,
  agencyApprovedRevision: true,
  customerApprovedRevision: true,
  mileage: true,
  fuelLevel: true,
  publishedAt: true,
  mutuallyApprovedAt: true,
  createdAt: true,
  updatedAt: true,
  agency: { select: { name: true } },
  car: {
    select: { agencyId: true, brand: true, model: true, licensePlate: true },
  },
  booking: {
    select: {
      agencyId: true,
      carId: true,
      renterId: true,
      customer: { select: { agencyId: true, userId: true } },
    },
  },
  findings: { orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] },
  evidence: {
    select: {
      id: true,
      kind: true,
      filename: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
  events: {
    select: {
      id: true,
      revision: true,
      action: true,
      actorRole: true,
      createdAt: true,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  },
});
type ReportSnapshot = Prisma.GuardianReportGetPayload<{
  select: typeof reportSelect;
}>;
type PdfDownload = { buffer: Buffer; filename: string; revision: number };

@Injectable()
export class GuardianPdfService {
  private readonly logger = new Logger(GuardianPdfService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly storage?: VaultStorageService,
  ) {}

  forStaff(agencyId: string | undefined, id: string): Promise<PdfDownload> {
    // Prisma omits undefined filters. Never let an absent JWT tenant broaden a
    // PDF query, including when the platform capability bypass is in effect.
    if (typeof agencyId !== 'string' || !agencyId.trim())
      throw new NotFoundException('Inspection not found.');
    return this.generate({ id, agencyId });
  }

  forCustomer(userId: string | undefined, id: string): Promise<PdfDownload> {
    if (typeof userId !== 'string' || !userId.trim())
      throw new NotFoundException('Inspection not found.');
    return this.generate(
      {
        id,
        status: { not: 'DRAFT' },
        OR: [
          { booking: { renterId: userId } },
          { booking: { renterId: null, customer: { userId } } },
        ],
      },
      userId,
    );
  }

  private async generate(
    where: Prisma.GuardianReportWhereInput,
    customerId?: string,
  ): Promise<PdfDownload> {
    // Prisma may fetch includes with several SELECTs. A repeatable-read
    // snapshot prevents a concurrent publish/correction from combining a new
    // revision with old findings or approval events in the exported document.
    const report = await this.prisma.$transaction(
      (tx) => tx.guardianReport.findFirst({ where, select: reportSelect }),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    if (
      !report ||
      report.booking.agencyId !== report.agencyId ||
      report.booking.customer.agencyId !== report.agencyId ||
      report.car.agencyId !== report.agencyId ||
      report.booking.carId !== report.carId ||
      (customerId !== undefined &&
        (report.status === 'DRAFT' ||
          (report.booking.renterId ?? report.booking.customer.userId) !==
            customerId))
    ) {
      throw new NotFoundException('Inspection not found.');
    }
    // Resolve private media paths only AFTER authorizing this report.
    const embedded = await this.evidenceImages(report);
    const buffer = await this.render(this.html(report, new Date(), embedded));
    const identifier =
      report.id.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'report';
    return {
      buffer,
      filename: `guardian-${identifier}-r${report.revision}.pdf`,
      revision: report.revision,
    };
  }

  /**
   * Best-effort private photo embedding with bounded per-object and overall size.
   * Only include an original when its content hash and image signature match
   * the already-authorized report snapshot. Never allow external image URLs.
   */
  private async evidenceImages(
    report: ReportSnapshot,
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    if (!this.storage || !report.evidence.length) return result;
    const allowedKinds = new Set([
      'OVERVIEW',
      'ODOMETER',
      'FUEL',
      'DAMAGE',
      'REPAIR',
    ]);
    const allowedMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    const candidates = report.evidence
      .filter(
        (e) =>
          allowedKinds.has(e.kind) &&
          allowedMimes.has(e.mimeType) &&
          e.sizeBytes <= 8 * 1024 * 1024,
      )
      .slice(0, 40);
    if (!candidates.length) return result;
    const stored = await this.prisma.guardianEvidence.findMany({
      where: { reportId: report.id, id: { in: candidates.map((e) => e.id) } },
      select: {
        id: true,
        storagePath: true,
        sha256: true,
        mimeType: true,
        sizeBytes: true,
      },
    });
    const metadata = new Map(candidates.map((e) => [e.id, e]));
    let totalBytes = 0;
    for (const file of stored) {
      const record = metadata.get(file.id);
      if (
        !record ||
        !allowedMimes.has(file.mimeType) ||
        file.mimeType !== record.mimeType ||
        file.sha256 !== record.sha256 ||
        file.sizeBytes !== record.sizeBytes ||
        totalBytes + file.sizeBytes > 32 * 1024 * 1024
      )
        continue;
      try {
        const bytes = await this.storage.downloadEvidence(file.storagePath);
        const signature =
          file.mimeType === 'image/jpeg'
            ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
            : file.mimeType === 'image/png'
              ? bytes
                  .subarray(0, 8)
                  .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
              : bytes.toString('ascii', 0, 4) === 'RIFF' &&
                bytes.toString('ascii', 8, 12) === 'WEBP';
        const hash = createHash('sha256').update(bytes).digest('hex');
        if (
          !signature ||
          bytes.length !== file.sizeBytes ||
          hash !== file.sha256
        ) {
          this.logger.warn(
            'Guardian evidence failed integrity verification; omitted from PDF.',
          );
          continue;
        }
        totalBytes += bytes.length;
        result.set(
          file.id,
          'data:' + file.mimeType + ';base64,' + bytes.toString('base64'),
        );
      } catch {
        this.logger.warn(
          'Guardian private photo unavailable; omitted from PDF.',
        );
      }
    }
    return result;
  }

  private esc(value: string | number | null | undefined): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private timestamp(value: Date | null | undefined): string {
    return value ? new Date(value).toISOString() : 'Not recorded';
  }

  private html(
    report: ReportSnapshot,
    exportedAt: Date,
    embeddedImages: Map<string, string> = new Map(),
  ): string {
    const e = (value: string | number | null | undefined) => this.esc(value);
    const eventAt = (action: string, role: string) =>
      report.events
        .filter(
          (event) =>
            event.revision === report.revision &&
            event.action === action &&
            event.actorRole === role,
        )
        .at(-1)?.createdAt;
    const agencyApproved = report.agencyApprovedRevision === report.revision;
    const customerApproved =
      report.customerApprovedRevision === report.revision;
    const mutual =
      report.status === 'MUTUALLY_APPROVED' &&
      agencyApproved &&
      customerApproved;
    const reference = (id: string | null, label: string) => {
      const media = report.evidence.find((item) => item.id === id);
      const photo = id ? embeddedImages.get(id) : undefined;
      return media
        ? `<p>${e(label)}: <span class="mono">${e(media.id)}</span><br>SHA256: <span class="mono">${e(media.sha256)}</span></p>${
            photo
              ? `<img class="evidence-img" src="${photo}" alt="${e(label)}">`
              : media.mimeType.startsWith('image/')
                ? '<p class="subtitle">Photo unavailable in this PDF; view the original in the authenticated portal.</p>'
                : ''
          }`
        : `<p>${e(label)}: ${id ? 'Evidence reference unavailable' : 'None'}</p>`;
    };
    const findings = report.findings
      .map(
        (finding, index) => `
      <section class="finding">
        <h3>Finding ${index + 1}: ${e(finding.zone)} / ${e(finding.kind)}</h3>
        <p>Reference: <span class="mono">${e(finding.id)}</span><br>Status: ${e(finding.status)} | Reported by: ${e(finding.source)}</p>
        <p class="multiline">${e(finding.description || 'No description')}</p>
        ${finding.agencyNote ? `<p class="multiline">Agency review note: ${e(finding.agencyNote)}</p>` : ''}
        ${reference(finding.photoId, 'Original photograph evidence')}
        ${finding.videoId ? `${reference(finding.videoId, 'Video evidence')}<p>Video offset: ${e(finding.videoOffsetSec ?? 'Not recorded')} seconds</p>` : ''}
        <p>Finding recorded: ${e(this.timestamp(finding.createdAt))}</p>
        ${finding.repairedAt ? `<p>Later repair verified: ${e(this.timestamp(finding.repairedAt))}. This is additional history; the original finding remains recorded.</p>${reference(finding.repairPhotoId, 'After-repair photograph evidence')}` : ''}
      </section>`,
      )
      .join('');
    const evidence = report.evidence
      .map(
        (item) => `
      <tr><td>${e(item.kind)}<br><span class="mono">${e(item.id)}</span></td><td class="multiline">${e(item.filename)}<br>${e(item.mimeType)}; ${e(item.sizeBytes)} bytes<br>${e(this.timestamp(item.createdAt))}${embeddedImages.has(item.id) ? `<img class="evidence-thumb" src="${embeddedImages.get(item.id)}" alt="${e(item.kind)} evidence">` : ''}</td><td class="mono">${e(item.sha256)}</td></tr>`,
      )
      .join('');
    const events = report.events
      .map(
        (event) =>
          `<tr><td>${e(this.timestamp(event.createdAt))}</td><td>${e(event.revision)}</td><td>${e(event.actorRole)}</td><td>${e(event.action)}</td></tr>`,
      )
      .join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; img-src data:; connect-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
      <title>Guardian inspection report</title><style>
      body{font-family:Arial,sans-serif;color:#24212b;font-size:10px;line-height:1.5}h1{font-size:23px;margin-bottom:3px}h2{font-size:16px;margin-top:24px}h3{font-size:12px}p{margin:5px 0}.subtitle{color:#555}.notice{border:1px solid #aaa;padding:10px;margin:16px 0;background:#f6f5f4}.mono{font-family:monospace;overflow-wrap:anywhere;word-break:break-all}.multiline{white-space:pre-wrap;overflow-wrap:anywhere}.finding{border-top:1px solid #bbb;padding:10px 0;break-inside:avoid}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{text-align:left;vertical-align:top;padding:7px;border:1px solid #ccc;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}.evidence-img{display:block;max-width:150mm;max-height:95mm;object-fit:contain;margin:8px 0;break-inside:avoid}.evidence-thumb{display:block;max-width:55mm;max-height:35mm;object-fit:contain;margin-top:4px}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      </style></head><body>
      <h1>Guardian inspection report</h1><p class="subtitle">${e(report.agency.name)}</p>
      <p>Report: <span class="mono">${e(report.id)}</span><br>Booking: <span class="mono">${e(report.bookingId)}</span></p>
      <div class="notice"><strong>Current revision ${e(report.revision)} — ${e(report.status)}</strong><br>
      ${mutual ? 'Both parties approved this revision.' : 'This revision is not mutually approved.'}
      Approval records acknowledge the condition report only. They do not establish liability, consent to payment, or financial settlement.</div>
      <div class="meta"><section><h2>Vehicle and inspection</h2><p>${e(report.car.brand)} ${e(report.car.model)}<br>Registration: ${e(report.car.licensePlate)}<br>Vehicle reference: <span class="mono">${e(report.carId)}</span></p>
      <p>Phase: ${e(report.phase)} (${report.phase === 'OUT' ? 'Departure' : report.phase === 'IN' ? 'Return' : 'Unspecified'})<br>Capture mode: ${e(report.mode)}<br>Recorded odometer: ${e(report.mileage)} km<br>Recorded fuel: ${e(report.fuelLevel)}/8 (eighths)</p><p class="subtitle">Vehicle description is the current agency vehicle record at export time.</p></section>
      <section><h2>Revision and approval timestamps (UTC)</h2>
      <p>Created: ${e(this.timestamp(report.createdAt))}<br>Report updated: ${e(this.timestamp(report.updatedAt))}<br>Current revision published: ${e(this.timestamp(eventAt('PUBLISHED', 'AGENCY')))}</p>
      <p>Agency approved revision: ${e(report.agencyApprovedRevision ?? 'None')}<br>Current agency approval recorded: ${agencyApproved ? e(this.timestamp(eventAt('PUBLISHED', 'AGENCY'))) : 'Not approved'}<br>Customer approved revision: ${e(report.customerApprovedRevision ?? 'None')}<br>Current customer approval recorded: ${customerApproved ? e(this.timestamp(eventAt('APPROVED', 'CUSTOMER'))) : 'Not approved'}<br>Mutual approval for current revision: ${mutual ? e(this.timestamp(report.mutuallyApprovedAt)) : 'Not mutually approved'}</p>
      <p>Latest publication across revisions: ${e(this.timestamp(report.publishedAt))}<br>Exported: ${e(this.timestamp(exportedAt))}</p></section></div>
      <h2>Findings (${e(report.findings.length)})</h2>${findings || '<p>No findings recorded.</p>'}
      <h2>Evidence manifest (${e(report.evidence.length)})</h2><p>Evidence is referenced by its private report identifier and original uploaded-byte SHA256. Use the authenticated report to view originals. Verified photos are embedded when accessible from private storage; missing photos remain referenced by SHA256. The original video is available through the authenticated portal. REPAIR evidence and later repair verification are agency lifecycle additions; they are not a new customer approval of the repaired condition.</p>
      <table><thead><tr><th>Kind / evidence reference</th><th>File / recorded upload (UTC)</th><th>SHA256 of uploaded bytes</th></tr></thead><tbody>${evidence || '<tr><td colspan="3">No evidence recorded.</td></tr>'}</tbody></table>
      <h2>Recorded report history (all revisions)</h2><table><thead><tr><th>Timestamp (UTC)</th><th>Revision</th><th>Party</th><th>Action</th></tr></thead><tbody>${events || '<tr><td colspan="4">No audit events recorded.</td></tr>'}</tbody></table>
      <div class="notice">This is a point-in-time export of the current stored report and appended repair history. It is not a cryptographically signed document, independently attested capture timestamp, or forensic proof. Later changes require a new download.</div>
      </body></html>`;
  }

  private async render(html: string): Promise<Buffer> {
    let browser: Browser | undefined;
    try {
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      // No remote images/fonts, loopback requests or file:// access are needed
      // for this text-only manifest. Abort every request, not only HTTP URLs.
      page.on('request', (request) => {
        void request.abort().catch(() => undefined);
      });
      await page.setContent(html, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });
      const buffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '15mm', right: '14mm', bottom: '18mm', left: '14mm' },
        displayHeaderFooter: true,
        headerTemplate: '<div></div>',
        footerTemplate:
          '<div style="font-family:Arial;font-size:8px;width:100%;text-align:center;color:#666">Guardian inspection export · <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        timeout: 15000,
      });
      return Buffer.from(buffer);
    } catch {
      // Do not log rendered HTML, user content, browser paths or credentials.
      this.logger.error('Guardian inspection PDF rendering failed.');
      throw new ServiceUnavailableException(
        'Inspection PDF is temporarily unavailable.',
      );
    } finally {
      if (browser) await browser.close().catch(() => undefined);
    }
  }
}
