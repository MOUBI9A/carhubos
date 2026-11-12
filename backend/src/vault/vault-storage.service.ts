import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export const GUARDIAN_VIDEO_MAX_BYTES = 45 * 1024 * 1024;
const GUARDIAN_VIDEO_VERIFY_TIMEOUT_MS = 120_000;
const MP4_HEADER_LIMIT = 4096;
const MP4_BRANDS = new Set([
  'isom',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'iso7',
  'iso8',
  'iso9',
  'mp41',
  'mp42',
  'avc1',
  'M4V ',
  'MSNV',
  'dash',
]);

/**
 * Thin wrapper around Supabase Storage — the only place in the app that talks
 * to the Supabase SDK. Dormant until configured with SUPABASE_URL plus a
 * server-only secret (`SUPABASE_SECRET_KEY` preferred; legacy
 * `SUPABASE_SERVICE_ROLE_KEY` remains supported during migration).
 *
 * A server secret, never an anon/publishable key, is required: uploads,
 * signed-URL generation, and deletes all happen server-side against a PRIVATE
 * bucket. Tenant isolation is enforced by this app (every call is scoped by
 * the caller's own `agencyId`, checked before this class is invoked — see
 * `vault.service.ts`).
 */
@Injectable()
export class VaultStorageService {
  private readonly logger = new Logger(VaultStorageService.name);
  private client: SupabaseClient | null = null;

  private getBucket(): string {
    return process.env.SUPABASE_VAULT_BUCKET ?? 'vault-files';
  }

  private getClient(): SupabaseClient {
    if (this.client) return this.client;

    const url = process.env.SUPABASE_URL;
    const key =
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Vault storage is not configured — set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).',
      );
    }

    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
    return this.client;
  }

  /** Only server-generated Guardian video paths can receive upload authority. */
  private assertGuardianVideoPath(storagePath: string): void {
    if (
      !/^[a-zA-Z0-9_-]+\/guardian\/[a-zA-Z0-9_-]+\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.mp4$/i.test(
        storagePath,
      )
    ) {
      throw new BadRequestException('Invalid inspection upload path.');
    }
  }

  private guardianStorageUrls(): { api: URL; direct: URL } {
    let api: URL;
    try {
      api = new URL(process.env.SUPABASE_URL ?? '');
    } catch {
      throw new ServiceUnavailableException(
        'Inspection storage is not configured.',
      );
    }
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname);
    if (
      (api.protocol !== 'https:' && !(api.protocol === 'http:' && loopback)) ||
      api.username ||
      api.password ||
      api.search ||
      api.hash ||
      api.pathname !== '/'
    ) {
      throw new ServiceUnavailableException(
        'Inspection storage URL is invalid.',
      );
    }
    const direct = new URL(api.origin);
    // Supabase recommends the direct storage hostname for TUS uploads. Keep
    // custom domains and the local emulator at their configured trusted origin.
    if (/^[a-z0-9-]+\.supabase\.co$/i.test(direct.hostname)) {
      direct.hostname = direct.hostname.replace(
        '.supabase.co',
        '.storage.supabase.co',
      );
    }
    return { api, direct };
  }

  private async guardianPrivateBucket(): Promise<string> {
    const bucket = this.getBucket();
    try {
      const { data, error } = await this.getClient().storage.getBucket(bucket);
      if (error || !data || data.public !== false) {
        throw new Error('Private bucket required');
      }
    } catch {
      // Provider errors may contain signed URLs or credentials. Never log or
      // forward them to the browser from the direct-upload path.
      throw new ServiceUnavailableException(
        'Private inspection storage is unavailable.',
      );
    }
    return bucket;
  }

  /**
   * A path-bound token, never the server key. Supabase tokens last two hours;
   * the caller's persisted intent expiry remains authoritative on renewal.
   * Clients send this token ONLY as TUS x-signature, with no upsert header.
   */
  async createGuardianVideoUpload(storagePath: string): Promise<{
    bucketName: string;
    endpoint: string;
    token: string;
  }> {
    this.assertGuardianVideoPath(storagePath);
    const { direct } = this.guardianStorageUrls();
    const bucketName = await this.guardianPrivateBucket();
    try {
      const { data, error } = await this.getClient()
        .storage.from(bucketName)
        .createSignedUploadUrl(storagePath, { upsert: false });
      if (error || !data?.token || data.path !== storagePath) {
        throw new Error('Upload signing failed');
      }
      return {
        bucketName,
        endpoint: new URL('/storage/v1/upload/resumable', direct).toString(),
        token: data.token,
      };
    } catch {
      throw new ServiceUnavailableException(
        'Failed to authorize inspection video upload.',
      );
    }
  }

  /**
   * Hash the actual private object in a bounded stream before evidence exists.
   * Only a 4 KiB header and the current transport chunk remain in memory. This
   * checks MP4 container magic/brand, not codecs, malware or video quality.
   */
  async verifyGuardianVideo(
    storagePath: string,
    expectedSizeBytes: number,
  ): Promise<{
    sha256: string;
    sizeBytes: number;
    mimeType: 'video/mp4';
  }> {
    this.assertGuardianVideoPath(storagePath);
    if (
      !Number.isSafeInteger(expectedSizeBytes) ||
      expectedSizeBytes <= 0 ||
      expectedSizeBytes > GUARDIAN_VIDEO_MAX_BYTES
    ) {
      throw new BadRequestException(
        'Inspection video exceeds the 45 MiB limit.',
      );
    }
    const { api, direct } = this.guardianStorageUrls();
    const bucket = await this.guardianPrivateBucket();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      GUARDIAN_VIDEO_VERIFY_TIMEOUT_MS,
    );
    timeout.unref();
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const { data, error } = await this.getClient()
        .storage.from(bucket)
        .createSignedUrl(storagePath, 300);
      if (error || !data?.signedUrl)
        throw new ServiceUnavailableException(
          'Inspection video is not ready. Retry after the upload completes.',
        );
      const signed = new URL(data.signedUrl);
      if (
        ![api.origin, direct.origin].includes(signed.origin) ||
        signed.username ||
        signed.password ||
        signed.hash ||
        signed.pathname !== `/storage/v1/object/sign/${bucket}/${storagePath}`
      ) {
        throw new ServiceUnavailableException(
          'Private inspection video URL is invalid.',
        );
      }
      const response = await fetch(signed.toString(), {
        signal: controller.signal,
        redirect: 'error',
        cache: 'no-store',
        headers: { Accept: 'video/mp4', 'Accept-Encoding': 'identity' },
      });
      reader = response.body?.getReader();
      if (response.status !== 200 || !reader) {
        throw new ServiceUnavailableException(
          'Inspection video is not ready. Retry after the upload completes.',
        );
      }
      const contentType = response.headers
        .get('content-type')
        ?.split(';')[0]
        .trim()
        .toLowerCase();
      if (contentType !== 'video/mp4')
        throw new BadRequestException('Uploaded inspection video must be MP4.');
      const encoding = response.headers.get('content-encoding');
      if (encoding && encoding !== 'identity')
        throw new BadRequestException(
          'Encoded inspection video is not supported.',
        );
      const contentLength = response.headers.get('content-length');
      if (contentLength !== null) {
        if (!/^\d+$/.test(contentLength))
          throw new ServiceUnavailableException(
            'Inspection video size could not be verified.',
          );
        const length = Number(contentLength);
        if (length > GUARDIAN_VIDEO_MAX_BYTES || length > expectedSizeBytes)
          throw new BadRequestException(
            'Uploaded inspection video size does not match the intent.',
          );
        if (length < expectedSizeBytes)
          throw new ServiceUnavailableException(
            'Inspection video is incomplete. Resume the upload before retrying.',
          );
      }
      const hash = createHash('sha256');
      const header = Buffer.alloc(MP4_HEADER_LIMIT);
      let headerLength = 0;
      let sizeBytes = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sizeBytes += value.byteLength;
        if (
          sizeBytes > GUARDIAN_VIDEO_MAX_BYTES ||
          sizeBytes > expectedSizeBytes
        ) {
          controller.abort();
          throw new BadRequestException(
            'Uploaded inspection video size does not match the intent.',
          );
        }
        if (headerLength < MP4_HEADER_LIMIT) {
          const take = Math.min(
            value.byteLength,
            MP4_HEADER_LIMIT - headerLength,
          );
          header.set(value.subarray(0, take), headerLength);
          headerLength += take;
        }
        hash.update(value);
      }
      if (sizeBytes !== expectedSizeBytes)
        throw new ServiceUnavailableException(
          'Inspection video is incomplete. Resume the upload before retrying.',
        );
      const ftypSize = headerLength >= 16 ? header.readUInt32BE(0) : 0;
      if (
        ftypSize < 16 ||
        ftypSize > headerLength ||
        ftypSize % 4 !== 0 ||
        header.toString('ascii', 4, 8) !== 'ftyp' ||
        !MP4_BRANDS.has(header.toString('ascii', 8, 12))
      ) {
        throw new BadRequestException(
          'Uploaded file has invalid MP4 contents.',
        );
      }
      return { sha256: hash.digest('hex'), sizeBytes, mimeType: 'video/mp4' };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      )
        throw error;
      throw new ServiceUnavailableException(
        'Inspection video could not be verified. Retry when the upload is complete.',
      );
    } finally {
      clearTimeout(timeout);
      controller.abort();
      if (reader) {
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
    }
  }

  /** Uploads a buffer to `storagePath` in the private vault bucket. */
  async upload(
    storagePath: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<void> {
    const { error } = await this.getClient()
      .storage.from(this.getBucket())
      .upload(storagePath, buffer, { contentType: mimeType, upsert: false });

    if (error) {
      this.logger.error(
        `Supabase upload failed for ${storagePath}: ${error.message}`,
      );
      throw new ServiceUnavailableException('Failed to store the file.');
    }
  }

  /**
   * Server-only original-object read for authorized PDF evidence embedding.
   * Callers must authorize the report before supplying a stored object path.
   * Do not return raw storage paths or permanent object URLs to browsers.
   */
  async downloadEvidence(
    storagePath: string,
    maxBytes = 8 * 1024 * 1024,
  ): Promise<Buffer> {
    const { data, error } = await this.getClient()
      .storage.from(this.getBucket())
      .download(storagePath);
    if (error || !data) {
      throw new ServiceUnavailableException(
        'Private inspection evidence is unavailable.',
      );
    }
    if (data.size > maxBytes) {
      throw new ServiceUnavailableException(
        'Inspection evidence exceeds PDF image limit.',
      );
    }
    const bytes = Buffer.from(await data.arrayBuffer());
    if (bytes.length > maxBytes) {
      throw new ServiceUnavailableException(
        'Inspection evidence exceeds PDF image limit.',
      );
    }
    return bytes;
  }

  /**
   * Short-lived signed URL for a private object — the ONLY way a client ever
   * reads a vault file's bytes (never a public URL, never proxied through
   * this backend). Default 5 minutes: long enough for a client to start the
   * download, short enough that a leaked link goes stale quickly.
   */
  async createSignedUrl(
    storagePath: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    const { data, error } = await this.getClient()
      .storage.from(this.getBucket())
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      this.logger.error(
        `Supabase signed-URL failed for ${storagePath}: ${error?.message}`,
      );
      throw new ServiceUnavailableException(
        'Failed to generate a download link.',
      );
    }
    return data.signedUrl;
  }

  /**
   * Best-effort delete — logs rather than throws on failure. A storage-side
   * hiccup here must not block removing the (already-authoritative) metadata
   * row; a stray orphaned object is a cheap cleanup problem, not a correctness
   * one, and the caller (vault.service.ts) removes the DB row regardless.
   */
  async remove(storagePath: string): Promise<void> {
    const { error } = await this.getClient()
      .storage.from(this.getBucket())
      .remove([storagePath]);

    if (error) {
      this.logger.error(
        `Supabase remove failed for ${storagePath}: ${error.message}`,
      );
    }
  }
}
