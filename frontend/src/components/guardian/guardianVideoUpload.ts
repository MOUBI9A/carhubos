import type { Upload } from "tus-js-client";

export const VIDEO_CHUNK_BYTES = 6 * 1024 * 1024;
export const VIDEO_MAX_BYTES = 45 * 1024 * 1024;
export type GuardianUploadIntent = {
  id: string;
  reportId: string;
  revisionAtInit: number;
  storagePath: string;
  filename: string;
  mimeType: "video/mp4";
  expectedSizeBytes: number;
  expiresAt: string;
  status: "PENDING" | "COMPLETED" | "CANCELED";
};
export type SignedVideoIntent = GuardianUploadIntent & {
  bucketName: string;
  endpoint: string;
  token: string;
};
type Options = ConstructorParameters<typeof Upload>[1];
type PreviousUpload = Awaited<
  ReturnType<Upload["findPreviousUploads"]>
>[number];
const keyPrefix = (id: string) => `guardian-tus:v1:${id}:`;

export function validateVideoFile(
  file: File,
  intent?: GuardianUploadIntent,
): void {
  if (file.type !== "video/mp4")
    throw new Error(
      "Choose an MP4 video (video/mp4). Convert other formats first.",
    );
  if (!file.size || file.size > VIDEO_MAX_BYTES)
    throw new Error("MP4 video must be between 1 byte and 45 MiB.");
  if (
    intent &&
    (file.name !== intent.filename ||
      file.size !== intent.expectedSizeBytes ||
      file.type !== intent.mimeType)
  ) {
    throw new Error(
      "Select the original file with the same name, type and size to resume.",
    );
  }
}

export function needsResumableVideo(file: File): boolean {
  return file.size >= VIDEO_CHUNK_BYTES;
}

function safeUploadUrl(value: string, endpoint: string): boolean {
  try {
    const url = new URL(value);
    const base = new URL(endpoint);
    return (
      url.origin === base.origin &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      (url.pathname === base.pathname ||
        url.pathname.startsWith(base.pathname + "/"))
    );
  } catch {
    return false;
  }
}

/** Only the TUS location, size and local fingerprint survive reload; never a signature or request headers. */
export function guardianUrlStorage(
  intent: SignedVideoIntent,
  storage: Storage,
): NonNullable<Options["urlStorage"]> {
  const prefix = keyPrefix(intent.id);
  const entries = (): PreviousUpload[] => {
    const result: PreviousUpload[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (!key?.startsWith(prefix)) continue;
      try {
        const value = JSON.parse(storage.getItem(key) || "null");
        if (
          value &&
          typeof value.uploadUrl === "string" &&
          safeUploadUrl(value.uploadUrl, intent.endpoint) &&
          value.size === intent.expectedSizeBytes
        ) {
          result.push({
            uploadUrl: value.uploadUrl,
            size: value.size,
            creationTime: String(value.creationTime),
            urlStorageKey: key,
            metadata: {},
            parallelUploadUrls: null,
          });
        }
      } catch {
        /* Ignore invalid local resume entries; storage is not an authorization boundary. */
      }
    }
    return result;
  };
  return {
    findAllUploads: async () => entries(),
    findUploadsByFingerprint: async (fingerprint) =>
      entries().filter((entry) => entry.urlStorageKey === prefix + fingerprint),
    removeUpload: async (key) => {
      if (key.startsWith(prefix)) storage.removeItem(key);
    },
    addUpload: async (fingerprint, upload) => {
      if (
        !upload.uploadUrl ||
        !safeUploadUrl(upload.uploadUrl, intent.endpoint)
      )
        throw new Error("Storage returned an unexpected upload address.");
      const key = prefix + fingerprint;
      storage.setItem(
        key,
        JSON.stringify({
          uploadUrl: upload.uploadUrl,
          size: intent.expectedSizeBytes,
          creationTime: upload.creationTime,
        }),
      );
      return key;
    },
  };
}

export function forgetVideoResume(intentId: string): void {
  try {
    const storage = window.localStorage;
    const keys: string[] = [];
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (key?.startsWith(keyPrefix(intentId))) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    /* Browsers may disable local storage; same-tab pause/retry still works. */
  }
}

/** Sampled file identity prevents accidental resume with a different reselected file; server hashing remains authoritative. */
async function fileFingerprint(file: File): Promise<string> {
  const sampleSize = 64 * 1024;
  const [head, tail] = await Promise.all([
    file.slice(0, sampleSize).arrayBuffer(),
    file.slice(Math.max(0, file.size - sampleSize)).arrayBuffer(),
  ]);
  const identity = new TextEncoder().encode(
    JSON.stringify([file.name, file.type, file.size, file.lastModified]),
  );
  const bytes = new Uint8Array(
    identity.length + head.byteLength + tail.byteLength,
  );
  bytes.set(identity);
  bytes.set(new Uint8Array(head), identity.length);
  bytes.set(new Uint8Array(tail), identity.length + head.byteLength);
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
}

export function videoTransportError(error: Error): string {
  const status = (
    error as Error & { originalResponse?: { getStatus(): number } }
  ).originalResponse?.getStatus();
  if (status === 401 || status === 403)
    return "Upload authorization expired or was rejected. Cancel this upload and start again.";
  if (status === 409)
    return "Another upload is using this file location. Pause the other transfer, then retry.";
  if (status === 413)
    return "Storage rejected the video size. The private bucket must allow videos up to 45 MiB.";
  return "The video transfer was interrupted. Check your connection, then resume. Your accepted chunks can be reused before expiry.";
}

/** Create one signed TUS transfer. Credentials stay in this instance's memory, separate from URL storage. */
export async function prepareVideoUpload(
  file: File,
  intent: SignedVideoIntent,
  callbacks: {
    progress: (sent: number, total: number) => void;
    success: () => void;
    error: (message: string) => void;
  },
): Promise<{ upload: Upload; reloadResumeAvailable: boolean }> {
  validateVideoFile(file, intent);
  if (file.size < VIDEO_CHUNK_BYTES)
    throw new Error(
      "Use the standard upload for MP4 videos smaller than 6 MiB.",
    );
  if (Date.parse(intent.expiresAt) <= Date.now())
    throw new Error("This upload expired. Cancel it and start a new upload.");
  const fingerprint = await fileFingerprint(file);
  const { Upload: TusUpload } = await import("tus-js-client");
  let urlStorage: Options["urlStorage"];
  try {
    const storage = window.localStorage;
    const probe = "guardian-tus:probe";
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    urlStorage = guardianUrlStorage(intent, storage);
    const previous = await urlStorage.findAllUploads();
    if (
      previous.length &&
      !previous.some(
        (entry) => entry.urlStorageKey === keyPrefix(intent.id) + fingerprint,
      )
    ) {
      throw new Error(
        "This is a different file. Reselect the original video to resume its accepted chunks.",
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.startsWith("This is a different file")
    )
      throw error;
    // A denied/quota-exhausted storage area must not prevent an in-memory transfer.
  }
  const upload = new TusUpload(file, {
    endpoint: intent.endpoint,
    headers: { "x-signature": intent.token },
    chunkSize: VIDEO_CHUNK_BYTES,
    retryDelays: [0, 3000, 5000, 10000, 20000],
    uploadDataDuringCreation: true,
    uploadSize: file.size,
    removeFingerprintOnSuccess: false, // Keep the location until server finalization succeeds.
    storeFingerprintForResuming: !!urlStorage,
    ...(urlStorage ? { urlStorage } : {}),
    fingerprint: async () => fingerprint,
    metadata: {
      bucketName: intent.bucketName,
      objectName: intent.storagePath,
      contentType: intent.mimeType,
    },
    onBeforeRequest: (request) => {
      if (!safeUploadUrl(request.getURL(), intent.endpoint))
        throw new Error("Unexpected storage upload address.");
      if (Date.parse(intent.expiresAt) <= Date.now())
        throw new Error("Upload intent expired.");
      const xhr = request.getUnderlyingObject() as {
        withCredentials?: boolean;
      };
      if (xhr && "withCredentials" in xhr) xhr.withCredentials = false;
    },
    onShouldRetry: (error) => {
      const status = error.originalResponse?.getStatus() ?? 0;
      return (
        Date.parse(intent.expiresAt) > Date.now() &&
        (status === 0 || status === 409 || status === 423 || status >= 500)
      );
    },
    onProgress: callbacks.progress,
    onSuccess: callbacks.success,
    onError: (error) => callbacks.error(videoTransportError(error)),
  });
  const previous = urlStorage ? await upload.findPreviousUploads() : [];
  if (previous[0]) upload.resumeFromPreviousUpload(previous[0]);
  return { upload, reloadResumeAvailable: !!urlStorage };
}
