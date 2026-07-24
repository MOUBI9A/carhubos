import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Thin wrapper around Supabase Storage — the only place in the app that talks
 * to the Supabase SDK. Dormant until configured (SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY), same env-gated-adapter shape as
 * `payment-gateway/providers/stripe.gateway.ts`: real code, but throws a
 * clear error rather than silently no-op'ing if the founder's keys aren't set
 * yet.
 *
 * The service-role key (not the anon/public key) is required — uploads,
 * signed-URL generation, and deletes all happen server-side against a
 * PRIVATE bucket. Tenant isolation is enforced by this app (every call is
 * scoped by the caller's own `agencyId`, checked before this class is ever
 * invoked — see `vault.service.ts`), not by Supabase Row Level Security,
 * since Storage objects are addressed by path, not by a RLS-visible table.
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
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new ServiceUnavailableException(
        'Vault storage is not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
      );
    }
    this.client = createClient(url, key, {
      auth: { persistSession: false },
    });
    return this.client;
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
