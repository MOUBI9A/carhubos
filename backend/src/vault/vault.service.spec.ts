import { BadRequestException, NotFoundException } from '@nestjs/common';
import { VaultService } from './vault.service';
import { VAULT_MAX_FILE_SIZE_BYTES } from './dto/vault-file.dto';

/**
 * VaultService is the tenant-scoping + validation layer in front of
 * VaultStorageService (Supabase). Storage is a plain fake here — no real
 * network call, no Supabase SDK involved — so these specs prove the business
 * rules (tenant scoping, validation, cleanup-on-partial-failure) independent
 * of the actual storage backend.
 */
describe('VaultService', () => {
  function makeStorage() {
    return {
      upload: jest.fn().mockResolvedValue(undefined),
      createSignedUrl: jest.fn().mockResolvedValue('https://signed.example/x'),
      remove: jest.fn().mockResolvedValue(undefined),
    };
  }

  function makeFile(overrides: Partial<Record<string, any>> = {}) {
    return {
      originalname: 'insurance.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('pdf-bytes'),
      ...overrides,
    };
  }

  describe('upload', () => {
    it('rejects a disallowed mime type before ever touching storage', async () => {
      const storage = makeStorage();
      const prisma = { vaultFile: { create: jest.fn() } };
      const svc = new VaultService(prisma as any, storage as any);

      await expect(
        svc.upload('agency-a', 'user-1', makeFile({ mimetype: 'text/html' })),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
      expect(prisma.vaultFile.create).not.toHaveBeenCalled();
    });

    it('rejects a file over the size cap before ever touching storage', async () => {
      const storage = makeStorage();
      const prisma = { vaultFile: { create: jest.fn() } };
      const svc = new VaultService(prisma as any, storage as any);

      await expect(
        svc.upload(
          'agency-a',
          'user-1',
          makeFile({ size: VAULT_MAX_FILE_SIZE_BYTES + 1 }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('namespaces the storage path under the caller\'s own agencyId', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: { create: jest.fn().mockResolvedValue({ id: 'f1' }) },
      };
      const svc = new VaultService(prisma as any, storage as any);

      await svc.upload('agency-a', 'user-1', makeFile());

      const [storagePath] = storage.upload.mock.calls[0];
      expect(storagePath.startsWith('agency-a/')).toBe(true);
      expect(prisma.vaultFile.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agencyId: 'agency-a',
            uploadedById: 'user-1',
            storagePath,
          }),
        }),
      );
    });

    it('strips path separators from the original filename so it cannot escape its bucket segment', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: { create: jest.fn().mockResolvedValue({ id: 'f1' }) },
      };
      const svc = new VaultService(prisma as any, storage as any);

      await svc.upload(
        'agency-a',
        'user-1',
        makeFile({ originalname: '../../etc/passwd' }),
      );

      const [storagePath] = storage.upload.mock.calls[0];
      expect(storagePath).not.toContain('..');
      expect(storagePath).not.toContain('/etc/');
    });

    it('cleans up the just-uploaded object if the metadata insert fails', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: {
          create: jest.fn().mockRejectedValue(new Error('db down')),
        },
      };
      const svc = new VaultService(prisma as any, storage as any);

      await expect(svc.upload('agency-a', 'user-1', makeFile())).rejects.toThrow(
        'db down',
      );
      expect(storage.remove).toHaveBeenCalledTimes(1);
    });
  });

  describe('tenant isolation', () => {
    it('list() only ever queries the caller\'s own agencyId', async () => {
      const storage = makeStorage();
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { vaultFile: { findMany } };
      const svc = new VaultService(prisma as any, storage as any);

      await svc.list('agency-a', {});

      expect(findMany.mock.calls[0][0].where).toEqual({ agencyId: 'agency-a' });
    });

    it('search filters by filename, still scoped to the caller\'s agency', async () => {
      const storage = makeStorage();
      const findMany = jest.fn().mockResolvedValue([]);
      const prisma = { vaultFile: { findMany } };
      const svc = new VaultService(prisma as any, storage as any);

      await svc.list('agency-a', { search: 'insurance' });

      expect(findMany.mock.calls[0][0].where).toEqual({
        agencyId: 'agency-a',
        filename: { contains: 'insurance', mode: 'insensitive' },
      });
    });

    it('paginates when page/limit are given, returning the envelope shape', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: {
          findMany: jest.fn().mockResolvedValue([{ id: 'f1' }]),
          count: jest.fn().mockResolvedValue(1),
        },
      };
      const svc = new VaultService(prisma as any, storage as any);

      const result = await svc.list('agency-a', { page: 2, limit: 10 });

      expect(result).toEqual({
        items: [{ id: 'f1' }],
        total: 1,
        page: 2,
        limit: 10,
      });
      expect(prisma.vaultFile.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('getDownloadUrl 404s on a cross-tenant id instead of generating a URL', async () => {
      const storage = makeStorage();
      const prisma = { vaultFile: { findFirst: jest.fn().mockResolvedValue(null) } };
      const svc = new VaultService(prisma as any, storage as any);

      await expect(
        svc.getDownloadUrl('agency-a', 'someone-elses-file'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(storage.createSignedUrl).not.toHaveBeenCalled();
    });

    it('getDownloadUrl signs a URL for a file that does belong to the caller', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'f1', storagePath: 'agency-a/x', filename: 'x.pdf' }),
        },
      };
      const svc = new VaultService(prisma as any, storage as any);

      const result = await svc.getDownloadUrl('agency-a', 'f1');

      expect(storage.createSignedUrl).toHaveBeenCalledWith('agency-a/x');
      expect(result.url).toBe('https://signed.example/x');
    });

    it('remove() 404s on a cross-tenant id and never touches storage or the DB', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: { findFirst: jest.fn().mockResolvedValue(null), delete: jest.fn() },
      };
      const svc = new VaultService(prisma as any, storage as any);

      await expect(svc.remove('agency-a', 'someone-elses-file')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(storage.remove).not.toHaveBeenCalled();
      expect(prisma.vaultFile.delete).not.toHaveBeenCalled();
    });

    it('remove() deletes the storage object and the DB row for an owned file', async () => {
      const storage = makeStorage();
      const prisma = {
        vaultFile: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'f1', storagePath: 'agency-a/x' }),
          delete: jest.fn().mockResolvedValue({ id: 'f1' }),
        },
      };
      const svc = new VaultService(prisma as any, storage as any);

      const result = await svc.remove('agency-a', 'f1');

      expect(storage.remove).toHaveBeenCalledWith('agency-a/x');
      expect(prisma.vaultFile.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
      expect(result).toEqual({ id: 'f1', deleted: true });
    });
  });
});
