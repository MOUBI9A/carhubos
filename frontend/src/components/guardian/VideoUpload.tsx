"use client";

import { useEffect, useRef, useState } from "react";
import type { Upload } from "tus-js-client";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { guardianError, type GuardianReport } from "./types";
import {
  forgetVideoResume,
  needsResumableVideo,
  prepareVideoUpload,
  validateVideoFile,
  type GuardianUploadIntent,
  type SignedVideoIntent,
} from "./guardianVideoUpload";

type Phase =
  | "idle"
  | "starting"
  | "uploading"
  | "paused"
  | "error"
  | "uploaded"
  | "finalizing"
  | "canceling";
const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm";
const mib = (bytes: number) => (bytes / 1048576).toFixed(1);

/** Video capture is separate from the existing multipart photograph workflow. */
export function VideoUpload({
  report,
  refresh,
}: {
  report: GuardianReport;
  refresh: () => Promise<void>;
}) {
  const base =
    "/guardian/staff/reports/" +
    encodeURIComponent(report.id) +
    "/upload-intents";
  const [reloadKey, setReloadKey] = useState(0);
  const [intentsLoaded, setIntentsLoaded] = useState(false);
  const [pending, setPending] = useState<GuardianUploadIntent[]>([]);
  const [selected, setSelected] = useState<GuardianUploadIntent | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [sent, setSent] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reloadResume, setReloadResume] = useState(true);
  const transfer = useRef<Upload | null>(null);
  const mounted = useRef(true);
  const operation = useRef(0);
  const revision = useRef(report.revision);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const busy = ["starting", "uploading", "finalizing", "canceling"].includes(
    phase,
  );
  const stale = !!selected && selected.revisionAtInit !== report.revision;
  const expired = !!selected && Date.parse(selected.expiresAt) <= now;

  useEffect(() => {
    mounted.current = true;
    revision.current = report.revision;
    const generation = ++operation.current;
    let live = true;
    const current = transfer.current;
    transfer.current = null;
    void (current?.abort(false) ?? Promise.resolve())
      .catch(() => undefined)
      .then(() => {
        if (live && operation.current === generation) setPhase("idle");
      });
    api
      .get<GuardianUploadIntent[]>(base)
      .then(({ data }) => {
        if (live) {
          setPending(data);
          setIntentsLoaded(true);
        }
      })
      .catch(() => {
        if (live)
          setError(
            "Pending videos could not be loaded. Refresh this report before starting another upload.",
          );
      });
    return () => {
      live = false;
      mounted.current = false;
      operation.current++;
      // Keep accepted chunks for a later authenticated resume with the original file.
      const current = transfer.current;
      transfer.current = null;
      void current?.abort(false).catch(() => undefined);
    };
  }, [base, report.revision, report.status, reloadKey]);

  async function refreshAfterConflict(failure: unknown) {
    if (
      (failure as { response?: { status?: number } })?.response?.status === 409
    ) {
      try {
        await refresh();
      } catch {
        setNotice("Refresh failed. Refresh the report before retrying.");
      }
    }
  }
  async function finish(intent: GuardianUploadIntent) {
    if (!mounted.current) return;
    setPhase("finalizing");
    setError("");
    try {
      await api.post(
        base + "/" + intent.id + "/finalize",
        {},
        { timeout: 150000 },
      );
      forgetVideoResume(intent.id);
      transfer.current = null;
      if (!mounted.current) return;
      setPending((items) => items.filter((item) => item.id !== intent.id));
      setSelected(null);
      setFile(null);
      setPhase("idle");
      setSent(0);
      setNotice("Video verified and saved as inspection evidence.");
      try {
        await refresh();
      } catch {
        setError(
          "Video saved, but report refresh failed. Refresh this report to see the new revision.",
        );
      }
    } catch (failure) {
      if (!mounted.current) return;
      setPhase("uploaded");
      setError("Video is not yet saved as evidence: " + guardianError(failure));
      await refreshAfterConflict(failure);
    }
  }
  async function start() {
    if (!file || busy) return;
    const generation = ++operation.current;
    const stillCurrent = () =>
      mounted.current && operation.current === generation;
    setError("");
    setNotice("");
    try {
      validateVideoFile(file, selected ?? undefined);
      if (report.status !== "DRAFT" || stale || expired)
        throw new Error(
          "This report or upload changed. Cancel the pending upload and use the current draft revision.",
        );
      setPhase("starting");
      if (!selected && !needsResumableVideo(file)) {
        const data = new FormData();
        data.append("kind", "VIDEO");
        data.append("file", file);
        data.append("revision", String(report.revision));
        await api.post(
          "/guardian/staff/reports/" + report.id + "/evidence",
          data,
          { timeout: 120000 },
        );
        if (!stillCurrent()) return;
        setFile(null);
        setPhase("idle");
        setNotice("Video saved as inspection evidence.");
        try {
          await refresh();
        } catch {
          setError(
            "Video saved, but report refresh failed. Refresh this report to see the new revision.",
          );
        }
        return;
      }
      const intent = (
        await api.post<SignedVideoIntent>(
          selected ? base + "/" + selected.id + "/resume" : base,
          selected
            ? {}
            : {
                revision: report.revision,
                kind: "VIDEO",
                filename: file.name,
                mimeType: file.type,
                expectedSizeBytes: file.size,
              },
        )
      ).data;
      if (!stillCurrent()) {
        if (mounted.current) {
          try {
            const { data } = await api.get<GuardianUploadIntent[]>(base);
            if (mounted.current) setPending(data);
          } catch {
            /* A pending-list retry remains available. */
          }
        }
        return;
      }
      // Signatures are not included in public state, local storage, URLs or error text.
      const publicIntent: GuardianUploadIntent = {
        id: intent.id,
        reportId: intent.reportId,
        revisionAtInit: intent.revisionAtInit,
        storagePath: intent.storagePath,
        filename: intent.filename,
        mimeType: intent.mimeType,
        expectedSizeBytes: intent.expectedSizeBytes,
        expiresAt: intent.expiresAt,
        status: intent.status,
      };
      setSelected(publicIntent);
      setPending((items) => [
        ...items.filter((item) => item.id !== intent.id),
        publicIntent,
      ]);
      if (revision.current !== intent.revisionAtInit)
        throw new Error(
          "The report revision changed. Cancel this pending upload and refresh the draft.",
        );
      if (transfer.current?.file === file && selected?.id === intent.id) {
        transfer.current.options.headers = { "x-signature": intent.token };
        setPhase("uploading");
        transfer.current.start();
        return;
      }
      await transfer.current?.abort(false).catch(() => {
        throw new Error(
          "Could not pause the previous transfer. Retry before starting another.",
        );
      });
      if (!stillCurrent()) return;
      let preparedTransfer: Upload | null = null;
      const isTransferCurrent = () =>
        mounted.current &&
        preparedTransfer !== null &&
        transfer.current === preparedTransfer;
      const prepared = await prepareVideoUpload(file, intent, {
        progress: (bytes) => {
          if (isTransferCurrent()) setSent(bytes);
        },
        success: () => {
          if (isTransferCurrent()) void finish(publicIntent);
        },
        error: (message) => {
          if (isTransferCurrent()) {
            setError(message);
            setPhase("error");
          }
        },
      });
      if (!stillCurrent()) {
        await prepared.upload.abort(false).catch(() => undefined);
        return;
      }
      preparedTransfer = prepared.upload;
      transfer.current = prepared.upload;
      setReloadResume(prepared.reloadResumeAvailable);
      setPhase("uploading");
      prepared.upload.start();
    } catch (failure) {
      if (!stillCurrent()) return;
      setError(guardianError(failure));
      setPhase("error");
      await refreshAfterConflict(failure);
    }
  }
  async function pause() {
    try {
      await transfer.current?.abort(false);
      setPhase("paused");
      setNotice(
        "Transfer paused. Keep this tab open or reselect the original file after returning to this report.",
      );
    } catch {
      setError(
        "Could not pause the transfer. Check your connection and retry.",
      );
    }
  }
  async function cancel(intent: GuardianUploadIntent) {
    if (phase === "finalizing" || phase === "canceling") return;
    operation.current++;
    setPhase("canceling");
    setError("");
    try {
      if (intent.id === selected?.id) {
        const current = transfer.current;
        transfer.current = null;
        await current?.abort(false).catch(() => undefined);
      }
      await api.post(base + "/" + intent.id + "/cancel", {});
      forgetVideoResume(intent.id);
      setPending((items) => items.filter((item) => item.id !== intent.id));
      if (intent.id === selected?.id) {
        transfer.current = null;
        setSelected(null);
        setFile(null);
        setSent(0);
        setPhase("idle");
      }
      setPhase("idle");
      setNotice(
        "Pending upload canceled. It will not become inspection evidence.",
      );
    } catch (failure) {
      setPhase("paused");
      setError("Cancellation was not confirmed: " + guardianError(failure));
    }
  }

  if (report.status !== "DRAFT" && !pending.length) return null;
  return (
    <section
      className="rounded-xl border border-dashed border-border p-4 space-y-3"
      aria-label="Walkaround video upload"
    >
      <h3 className="font-semibold text-sm">Walkaround MP4 video</h3>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={busy}
        onClick={() => setReloadKey((value) => value + 1)}
      >
        Refresh pending videos
      </Button>
      <p className="text-xs text-text-muted">
        Up to 150 MiB. Videos from 6 MiB use resumable private upload. Pending
        uploads expire after two hours. Keep the original file to resume.
      </p>
      {pending.map((intent) => (
        <div
          className="rounded-lg border border-border p-3 space-y-2"
          key={intent.id}
        >
          <p className="text-sm break-all">
            {intent.filename} · {mib(intent.expectedSizeBytes)} MiB · Revision{" "}
            {intent.revisionAtInit}
          </p>
          <p className="text-xs text-text-muted">
            Expires {new Date(intent.expiresAt).toLocaleString()}
            {intent.revisionAtInit !== report.revision
              ? " · Report changed; cancel and start again."
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {intent.id !== selected?.id &&
              report.status === "DRAFT" &&
              intent.revisionAtInit === report.revision &&
              Date.parse(intent.expiresAt) > now && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setSelected(intent);
                    setFile(null);
                    setSent(0);
                    setPhase("idle");
                    setError("");
                    setNotice(
                      "Reselect the original file, then resume. If transfer already finished, verify it below.",
                    );
                  }}
                >
                  Select pending video
                </Button>
              )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={
                phase === "finalizing" ||
                phase === "canceling" ||
                (busy && intent.id !== selected?.id)
              }
              onClick={() => void cancel(intent)}
            >
              Cancel pending video
            </Button>
          </div>
        </div>
      ))}
      {report.status === "DRAFT" && (!pending.length || selected) && (
        <>
          <label className="block text-sm">
            {selected ? "Reselect original MP4 video" : "MP4 video file"}
            <input
              key={selected?.id ?? "new"}
              type="file"
              accept="video/mp4"
              disabled={busy}
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setError("");
              }}
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!file || busy || stale || expired || !intentsLoaded}
              onClick={() => void start()}
            >
              {selected ? "Resume selected video" : "Upload video"}
            </Button>
            {phase === "uploading" && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void pause()}
              >
                Pause transfer
              </Button>
            )}
            {selected && !busy && !stale && !expired && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void finish(selected)}
              >
                Verify completed upload
              </Button>
            )}
          </div>
        </>
      )}
      {(selected || busy) && (
        <div className="space-y-1" aria-live="polite">
          <progress
            aria-label="Video upload progress"
            value={sent}
            max={selected?.expectedSizeBytes || file?.size || 1}
            className="w-full"
          />
          <p className="text-xs text-text-muted">
            {phase === "finalizing"
              ? "Verifying stored video bytes. Evidence is saved only after verification."
              : phase === "uploaded"
                ? "Awaiting server verification. Retry verification or resume if the transfer was incomplete."
                : `${mib(sent)} / ${mib(selected?.expectedSizeBytes || file?.size || 0)} MiB · ${phase}`}
          </p>
        </div>
      )}
      {!reloadResume && (
        <p className="text-xs text-text-muted">
          This browser blocked resume storage. Keep this tab open to pause and
          resume; reloading may restart the transfer.
        </p>
      )}
      {(stale || expired) && (
        <p role="alert" className="text-sm text-danger">
          {expired
            ? "The pending upload expired."
            : "The report revision changed."}{" "}
          Cancel this pending upload before starting again.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger break-words">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-text-muted">
          {notice}
        </p>
      )}
    </section>
  );
}
