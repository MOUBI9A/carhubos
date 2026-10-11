import { ServiceUnavailableException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { VaultStorageService } from './vault-storage.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

/**
 * VaultStorageService is the only place the app talks to the Supabase SDK.
 * These specs mock createClient entirely — no real network call — to prove
 * (a) it fails clearly when unconfigured rather than silently no-op'ing, and
 * (b) upload/createSignedUrl/remove call the SDK with the right arguments
 * and translate its error shape into the app's own exceptions/logging.
 */
describe('VaultStorageService', () => {
  const mockCreateClient = createClient as jest.Mock;

  beforeEach(() => {
    mockCreateClient.mockReset();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_VAULT_BUCKET;
  });

  function mockSupabaseStorage(overrides: Partial<Record<string, any>> = {}) {
    const bucketApi = {
      upload: jest.fn().mockResolvedValue({ error: null }),
      createSignedUrl: jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: 'https://signed.example/x' }, error: null }),
      remove: jest.fn().mockResolvedValue({ error: null }),
      ...overrides,
    };
    mockCreateClient.mockReturnValue({
      storage: { from: jest.fn().mockReturnValue(bucketApi) },
    });
    return bucketApi;
  }

  it('throws a clear, typed error when SUPABASE_URL/SERVICE_ROLE_KEY are unset — no silent no-op', async () => {
    const service = new VaultStorageService();

    await expect(
      service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('constructs the client from env once configured, and reuses it across calls', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSupabaseStorage();
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');
    await service.upload('agency-a/file2.pdf', Buffer.from('y'), 'application/pdf');

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'service-role-key',
      expect.any(Object),
    );
  });

  it('accepts SUPABASE_SECRET_KEY as an alias for SUPABASE_SERVICE_ROLE_KEY', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'secret-key-from-vercel';
    mockSupabaseStorage();
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'secret-key-from-vercel',
      expect.any(Object),
    );
  });

  it('uploads to the configured bucket (default "vault-files") with the right content type', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const bucketApi = mockSupabaseStorage();
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');

    expect(bucketApi.upload).toHaveBeenCalledWith(
      'agency-a/file.pdf',
      Buffer.from('x'),
      { contentType: 'application/pdf', upsert: false },
    );
  });

  it('honors SUPABASE_VAULT_BUCKET when set', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    process.env.SUPABASE_VAULT_BUCKET = 'custom-bucket';
    mockCreateClient.mockReturnValue({
      storage: {
        from: jest.fn().mockReturnValue({
          upload: jest.fn().mockResolvedValue({ error: null }),
        }),
      },
    });
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');

    const client = mockCreateClient.mock.results[0].value;
    expect(client.storage.from).toHaveBeenCalledWith('custom-bucket');
  });

  it('translates a Supabase upload error into a ServiceUnavailableException', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSupabaseStorage({
      upload: jest.fn().mockResolvedValue({ error: { message: 'bucket not found' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('createSignedUrl returns the SDK-provided URL on success', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    const bucketApi = mockSupabaseStorage();
    const service = new VaultStorageService();

    const url = await service.createSignedUrl('agency-a/file.pdf', 120);

    expect(bucketApi.createSignedUrl).toHaveBeenCalledWith('agency-a/file.pdf', 120);
    expect(url).toBe('https://signed.example/x');
  });

  it('createSignedUrl throws when the SDK errors or returns no URL', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSupabaseStorage({
      createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.createSignedUrl('agency-a/missing.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('remove() logs but does not throw when the SDK reports an error (best-effort)', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
    mockSupabaseStorage({
      remove: jest.fn().mockResolvedValue({ error: { message: 'already gone' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.remove('agency-a/file.pdf'),
    ).resolves.toBeUndefined();
  });
});
