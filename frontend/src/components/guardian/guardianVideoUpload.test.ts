import { File as NodeFile } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  forgetVideoResume,
  guardianUrlStorage,
  needsResumableVideo,
  prepareVideoUpload,
  validateVideoFile,
  VIDEO_CHUNK_BYTES,
  VIDEO_MAX_BYTES,
  videoTransportError,
  type SignedVideoIntent,
} from "./guardianVideoUpload";
import { Upload } from "tus-js-client";

vi.mock("tus-js-client", () => ({
  Upload: vi.fn(function (this: Record<string, unknown>, file, options) {
    this.file = file;
    this.options = options;
    this.findPreviousUploads = async () =>
      options.urlStorage.findUploadsByFingerprint(await options.fingerprint());
    this.resumeFromPreviousUpload = vi.fn();
  }),
}));
const intent = (): SignedVideoIntent => ({
  id: "intent-1",
  reportId: "report-1",
  revisionAtInit: 3,
  storagePath: "guardian/agency/report/random.mp4",
  filename: "walk.mp4",
  mimeType: "video/mp4",
  expectedSizeBytes: VIDEO_CHUNK_BYTES,
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  status: "PENDING",
  bucketName: "private-vault",
  endpoint: "https://project.storage.supabase.co/storage/v1/upload/resumable",
  token: "NEVER-PERSIST-SIGNED-TOKEN",
});
const file = (fill = 0) =>
  new NodeFile([new Uint8Array(VIDEO_CHUNK_BYTES).fill(fill)], "walk.mp4", {
    type: "video/mp4",
    lastModified: 123,
  }) as unknown as File;
const callbacks = () => ({
  progress: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
});
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubGlobal("crypto", webcrypto);
});
afterEach(() => vi.unstubAllGlobals());

describe("Guardian resumable video transport", () => {
  it("routes every video above the 32 MiB multipart cap through TUS and enforces file limits", () => {
    expect(needsResumableVideo({ size: VIDEO_CHUNK_BYTES - 1 } as File)).toBe(
      false,
    );
    expect(needsResumableVideo({ size: VIDEO_CHUNK_BYTES } as File)).toBe(true);
    expect(needsResumableVideo({ size: 40 * 1048576 } as File)).toBe(true);
    expect(() =>
      validateVideoFile({ type: "video/mp4", size: VIDEO_MAX_BYTES } as File),
    ).not.toThrow();
    expect(() =>
      validateVideoFile({
        type: "video/mp4",
        size: VIDEO_MAX_BYTES + 1,
      } as File),
    ).toThrow(/150 MiB/);
    expect(() =>
      validateVideoFile({ type: "video/quicktime", size: 10 } as File),
    ).toThrow(/MP4/);
    expect(() =>
      validateVideoFile({ type: "video/mp4", size: 0 } as File),
    ).toThrow();
    expect(() =>
      validateVideoFile(
        {
          type: "video/mp4",
          size: VIDEO_CHUNK_BYTES,
          name: "other.mp4",
        } as File,
        intent(),
      ),
    ).toThrow(/original file/);
  });

  it("uses only an in-memory signature, 6 MiB chunks and fixed storage metadata", async () => {
    const descriptor = intent();
    const { upload } = await prepareVideoUpload(
      file(),
      descriptor,
      callbacks(),
    );
    expect(upload.options.headers).toEqual({ "x-signature": descriptor.token });
    expect(upload.options.chunkSize).toBe(6 * 1024 * 1024);
    expect(upload.options.metadata).toEqual({
      bucketName: descriptor.bucketName,
      objectName: descriptor.storagePath,
      contentType: "video/mp4",
    });
    expect(upload.options.removeFingerprintOnSuccess).toBe(false);
    const fingerprint = await upload.options.fingerprint!(
      file(),
      upload.options,
    );
    await upload.options.urlStorage!.addUpload(fingerprint, {
      uploadUrl: descriptor.endpoint + "/upload-id",
      size: descriptor.expectedSizeBytes,
      creationTime: "today",
      metadata: { token: descriptor.token },
      urlStorageKey: "",
      parallelUploadUrls: null,
    });
    const stored = Object.values(localStorage).join();
    expect(stored).not.toContain(descriptor.token);
    expect(stored).not.toContain("headers");
    expect(stored).not.toContain("bucketName");
    expect(stored).toContain("upload-id");
    forgetVideoResume(descriptor.id);
    expect(localStorage.length).toBe(0);
  });

  it("rejects a different reselected file and never restores token-bearing or foreign URLs", async () => {
    const descriptor = intent();
    const { upload } = await prepareVideoUpload(
      file(),
      descriptor,
      callbacks(),
    );
    const fingerprint = await upload.options.fingerprint!(
      file(),
      upload.options,
    );
    await upload.options.urlStorage!.addUpload(fingerprint, {
      uploadUrl: descriptor.endpoint + "/upload-id",
      size: descriptor.expectedSizeBytes,
      creationTime: "today",
      metadata: {},
      urlStorageKey: "",
      parallelUploadUrls: null,
    });
    await expect(
      prepareVideoUpload(file(1), descriptor, callbacks()),
    ).rejects.toThrow(/different file/);
    const storage = guardianUrlStorage(descriptor, localStorage);
    await expect(
      storage.addUpload("bad", {
        uploadUrl: "https://attacker.invalid/upload",
        size: descriptor.expectedSizeBytes,
      } as never),
    ).rejects.toThrow(/unexpected upload address/);
    await expect(
      storage.addUpload("bad", {
        uploadUrl: descriptor.endpoint + "/id?token=secret",
        size: descriptor.expectedSizeBytes,
      } as never),
    ).rejects.toThrow();
    const xhr = { withCredentials: true };
    upload.options.onBeforeRequest!({
      getURL: () => descriptor.endpoint,
      getUnderlyingObject: () => xhr,
    } as never);
    expect(xhr.withCredentials).toBe(false);
    expect(() =>
      upload.options.onBeforeRequest!({
        getURL: () => "https://attacker.invalid/upload",
      } as never),
    ).toThrow(/Unexpected storage/);
  });

  it("retains a safe upload location across reload with the matching original file", async () => {
    const descriptor = intent();
    const first = await prepareVideoUpload(file(), descriptor, callbacks());
    const fingerprint = await first.upload.options.fingerprint!(
      file(),
      first.upload.options,
    );
    await first.upload.options.urlStorage!.addUpload(fingerprint, {
      uploadUrl: descriptor.endpoint + "/saved-upload",
      size: descriptor.expectedSizeBytes,
      creationTime: "today",
      metadata: {},
      urlStorageKey: "",
      parallelUploadUrls: null,
    });
    const second = await prepareVideoUpload(file(), descriptor, callbacks());
    expect(second.upload.resumeFromPreviousUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        uploadUrl: descriptor.endpoint + "/saved-upload",
      }),
    );
  });

  it("blocks expired intents and never renders SDK errors containing signed headers", async () => {
    await expect(
      prepareVideoUpload(
        file(),
        { ...intent(), expiresAt: new Date(Date.now() - 1).toISOString() },
        callbacks(),
      ),
    ).rejects.toThrow(/expired/);
    expect(Upload).not.toHaveBeenCalled();
    const callback = callbacks();
    const { upload } = await prepareVideoUpload(file(), intent(), callback);
    upload.options.onError!(
      new Error("Request x-signature: NEVER-PERSIST-SIGNED-TOKEN"),
    );
    expect(callback.error.mock.calls[0][0]).not.toContain("NEVER-PERSIST");
    expect(videoTransportError(new Error("secret"))).not.toContain("secret");
  });
});
