import { ServiceUnavailableException } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { VaultStorageService } from './vault-storage.service';

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('VaultStorageService', () => {
  const mockCreateClient = createClient as jest.Mock;

  beforeEach(() => {
    mockCreateClient.mockReset();
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
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

  function configureModernSecret() {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
  }

  it('throws a clear typed error when the URL/server secret are unset', async () => {
    const service = new VaultStorageService();

    await expect(
      service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('prefers the modern Supabase secret key and reuses the client', async () => {
    configureModernSecret();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role-key';
    mockSupabaseStorage();
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');
    await service.upload('agency-a/file2.pdf', Buffer.from('y'), 'application/pdf');

    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'sb_secret_test',
      expect.any(Object),
    );
  });

  it('supports the legacy service-role key during migration', async () => {
    process.env.SUPABASE_URL = 'https://proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role-key';
    mockSupabaseStorage();
    const service = new VaultStorageService();

    await service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf');

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://proj.supabase.co',
      'legacy-service-role-key',
      expect.any(Object),
    );
  });

  it('uploads to the configured bucket (default "vault-files") with the right content type', async () => {
    configureModernSecret();
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
    configureModernSecret();
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
    configureModernSecret();
    mockSupabaseStorage({
      upload: jest.fn().mockResolvedValue({ error: { message: 'bucket not found' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.upload('agency-a/file.pdf', Buffer.from('x'), 'application/pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('createSignedUrl returns the SDK-provided URL on success', async () => {
    configureModernSecret();
    const bucketApi = mockSupabaseStorage();
    const service = new VaultStorageService();

    const url = await service.createSignedUrl('agency-a/file.pdf', 120);

    expect(bucketApi.createSignedUrl).toHaveBeenCalledWith('agency-a/file.pdf', 120);
    expect(url).toBe('https://signed.example/x');
  });

  it('createSignedUrl throws when the SDK errors or returns no URL', async () => {
    configureModernSecret();
    mockSupabaseStorage({
      createSignedUrl: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.createSignedUrl('agency-a/missing.pdf'),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('remove() logs but does not throw when the SDK reports an error', async () => {
    configureModernSecret();
    mockSupabaseStorage({
      remove: jest.fn().mockResolvedValue({ error: { message: 'already gone' } }),
    });
    const service = new VaultStorageService();

    await expect(
      service.remove('agency-a/file.pdf'),
    ).resolves.toBeUndefined();
  });
});
