import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import {
  GUARDIAN_VIDEO_MAX_BYTES,
  VaultStorageService,
} from './vault-storage.service';

jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));

const PATH =
  'agency-a/guardian/report-a/ab733cb2-4566-4eb3-9e26-94e3dfd058b0.mp4';
const SIGNED_URL = `https://project.supabase.co/storage/v1/object/sign/vault-files/${PATH}?token=read-secret`;

function mp4(): Buffer {
  const bytes = Buffer.alloc(40);
  bytes.writeUInt32BE(24, 0);
  bytes.write('ftyp', 4);
  bytes.write('mp42', 8);
  bytes.write('isom', 16);
  bytes.write('mp42', 20);
  bytes.writeUInt32BE(16, 24);
  bytes.write('mdat', 28);
  bytes.write('payload!', 32);
  return bytes;
}

function streamResponse(
  chunks: Uint8Array[],
  headers: Record<string, string> = {},
  status = 200,
) {
  const canceled = jest.fn();
  let offset = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (offset === chunks.length) controller.close();
      else controller.enqueue(chunks[offset++]);
    },
    cancel: canceled,
  });
  return {
    response: new Response(body, {
      status,
      headers: { 'content-type': 'video/mp4', ...headers },
    }),
    canceled,
  };
}

describe('Guardian signed TUS authorization and streamed object verification', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let fetchMock: jest.Mock;
  let bucketApi: {
    createSignedUploadUrl: jest.Mock;
    createSignedUrl: jest.Mock;
    download: jest.Mock;
  };
  let getBucket: jest.Mock;
  let from: jest.Mock;
  let loggerError: jest.SpyInstance;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://project.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'server-secret-never-returned';
    delete process.env.SUPABASE_VAULT_BUCKET;
    bucketApi = {
      createSignedUploadUrl: jest.fn().mockResolvedValue({
        data: { path: PATH, token: 'path-bound-upload-token' },
        error: null,
      }),
      createSignedUrl: jest
        .fn()
        .mockResolvedValue({ data: { signedUrl: SIGNED_URL }, error: null }),
      download: jest.fn(),
    };
    getBucket = jest
      .fn()
      .mockResolvedValue({ data: { public: false }, error: null });
    from = jest.fn().mockReturnValue(bucketApi);
    (createClient as jest.Mock).mockReturnValue({
      storage: { getBucket, from },
    });
    fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    loggerError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    loggerError.mockRestore();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('signs only the exact generated path without upsert and returns the direct TUS endpoint', async () => {
    const result = await new VaultStorageService().createGuardianVideoUpload(
      PATH,
    );
    expect(getBucket).toHaveBeenCalledWith('vault-files');
    expect(from).toHaveBeenCalledWith('vault-files');
    expect(bucketApi.createSignedUploadUrl).toHaveBeenCalledWith(PATH, {
      upsert: false,
    });
    expect(result).toEqual({
      bucketName: 'vault-files',
      endpoint:
        'https://project.storage.supabase.co/storage/v1/upload/resumable',
      token: 'path-bound-upload-token',
    });
    expect(JSON.stringify(result)).not.toContain(
      'server-secret-never-returned',
    );
  });

  it.each([
    '../other.mp4',
    'agency-a/vault/report-a/x.mp4',
    `agency-a/guardian/report-a/../${PATH.split('/').pop()}`,
    `${PATH}?upsert=true`,
    PATH.replace('.mp4', '.jpg'),
  ])('rejects arbitrary or manipulated upload paths: %s', async (path) => {
    await expect(
      new VaultStorageService().createGuardianVideoUpload(path),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(bucketApi.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([true, undefined])(
    'fails closed if bucket privacy is %s',
    async (publicFlag) => {
      getBucket.mockResolvedValue({
        data: { public: publicFlag },
        error: null,
      });
      await expect(
        new VaultStorageService().createGuardianVideoUpload(PATH),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(bucketApi.createSignedUploadUrl).not.toHaveBeenCalled();
    },
  );

  it('sanitizes SDK failures, without writing provider error details to logs', async () => {
    bucketApi.createSignedUploadUrl.mockRejectedValue(
      new Error('token=private-provider-secret'),
    );
    await expect(
      new VaultStorageService().createGuardianVideoUpload(PATH),
    ).rejects.toThrow('Failed to authorize inspection video upload.');
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('rejects an SDK signed path mismatch', async () => {
    bucketApi.createSignedUploadUrl.mockResolvedValue({
      data: { path: 'other-object', token: 'token' },
      error: null,
    });
    await expect(
      new VaultStorageService().createGuardianVideoUpload(PATH),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it.each([
    'http://project.supabase.co',
    'https://user:pass@project.supabase.co',
    'https://project.supabase.co/other',
    'https://project.supabase.co?token=x',
  ])('rejects unsafe configured origins: %s', async (url) => {
    process.env.SUPABASE_URL = url;
    await expect(
      new VaultStorageService().createGuardianVideoUpload(PATH),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(bucketApi.createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it.each([
    'http://127.0.0.1:54321',
    'https://storage.example.test',
    'https://project.storage.supabase.co',
  ])('supports a trusted local/custom/direct origin: %s', async (origin) => {
    process.env.SUPABASE_URL = origin;
    expect(
      (await new VaultStorageService().createGuardianVideoUpload(PATH))
        .endpoint,
    ).toBe(`${origin}/storage/v1/upload/resumable`);
  });

  it('hashes actual bytes with a split MP4 header; never downloads a whole SDK Blob', async () => {
    const bytes = mp4();
    fetchMock.mockResolvedValue(
      streamResponse(
        [bytes.subarray(0, 3), bytes.subarray(3, 13), bytes.subarray(13)],
        { 'content-length': String(bytes.length) },
      ).response,
    );
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, bytes.length),
    ).resolves.toEqual({
      sha256: createHash('sha256').update(bytes).digest('hex'),
      sizeBytes: bytes.length,
      mimeType: 'video/mp4',
    });
    expect(bucketApi.createSignedUrl).toHaveBeenCalledWith(PATH, 300);
    expect(bucketApi.download).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      SIGNED_URL,
      expect.objectContaining({
        redirect: 'error',
        cache: 'no-store',
        signal: expect.any(AbortSignal),
        headers: { Accept: 'video/mp4', 'Accept-Encoding': 'identity' },
      }),
    );
    const options = fetchMock.mock.calls[0][1];
    expect(options.headers).not.toHaveProperty('authorization');
  });

  it('checks bucket privacy again before reading an uploaded object', async () => {
    getBucket.mockResolvedValue({ data: { public: true }, error: null });
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    `https://attacker.example/storage/v1/object/sign/vault-files/${PATH}?token=x`,
    SIGNED_URL.replace(PATH, 'other-object'),
    SIGNED_URL.replace('https:', 'http:'),
  ])('refuses untrusted signed-read URLs: %s', async (signedUrl) => {
    bucketApi.createSignedUrl.mockResolvedValue({
      data: { signedUrl },
      error: null,
    });
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('treats missing/incomplete TUS objects as retryable and cancels the response body', async () => {
    const fixture = streamResponse([Buffer.from('not found')], {}, 404);
    fetchMock.mockResolvedValue(fixture.response);
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fixture.canceled).toHaveBeenCalled();
  });

  it.each<Record<string, string>>([{}, { 'content-length': '40' }])(
    'does not trust metadata when a stream is truncated: %j',
    async (headers) => {
      fetchMock.mockResolvedValue(
        streamResponse([mp4().subarray(0, 30)], headers).response,
      );
      await expect(
        new VaultStorageService().verifyGuardianVideo(PATH, 40),
      ).rejects.toThrow('Inspection video is incomplete.');
    },
  );

  it.each<Record<string, string>>([
    { 'content-type': 'image/jpeg' },
    { 'content-encoding': 'gzip' },
  ])('rejects wrong remote MIME/encoding: %j', async (headers) => {
    const fixture = streamResponse([mp4()], headers);
    fetchMock.mockResolvedValue(fixture.response);
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.canceled).toHaveBeenCalled();
  });

  it.each(['magic', 'brand', 'box-length'])(
    'rejects invalid MP4 %s despite claimed video/mp4',
    async (invalid) => {
      const bytes = mp4();
      if (invalid === 'magic') bytes.write('nope', 4);
      if (invalid === 'brand') bytes.write('heic', 8);
      if (invalid === 'box-length') bytes.writeUInt32BE(4096, 0);
      fetchMock.mockResolvedValue(streamResponse([bytes]).response);
      await expect(
        new VaultStorageService().verifyGuardianVideo(PATH, 40),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects objects larger than the declared intent before trusting their hash', async () => {
    fetchMock.mockResolvedValue(
      streamResponse([mp4()], { 'content-length': '41' }).response,
    );
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aborts and cancels an over-cap chunked stream without retaining the file', async () => {
    const chunk = Buffer.alloc(1024 * 1024);
    mp4().copy(chunk);
    let count = 0;
    const cancel = jest.fn();
    const response = new Response(
      new ReadableStream<Uint8Array>({
        pull(controller) {
          if (++count <= 152) controller.enqueue(chunk);
          else controller.close();
        },
        cancel,
      }),
      { headers: { 'content-type': 'video/mp4' } },
    );
    fetchMock.mockResolvedValue(response);
    await expect(
      new VaultStorageService().verifyGuardianVideo(
        PATH,
        GUARDIAN_VIDEO_MAX_BYTES,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(cancel).toHaveBeenCalled();
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it.each([0, -1, 1.5, NaN, GUARDIAN_VIDEO_MAX_BYTES + 1])(
    'rejects an invalid expected size %s without a storage request',
    async (size) => {
      await expect(
        new VaultStorageService().verifyGuardianVideo(PATH, size),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('sanitizes network/read errors without logging private URLs', async () => {
    fetchMock.mockRejectedValue(new Error(`transport failed ${SIGNED_URL}`));
    await expect(
      new VaultStorageService().verifyGuardianVideo(PATH, 40),
    ).rejects.toThrow('Inspection video could not be verified.');
    expect(loggerError).not.toHaveBeenCalled();
  });

  it('aborts timed-out private reads and returns a retryable sanitized error', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new Error('private read timed out')),
          );
        }),
    );
    const result = new VaultStorageService().verifyGuardianVideo(PATH, 40);
    const assertion = expect(result).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await jest.advanceTimersByTimeAsync(120_001);
    await assertion;
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  });
});
