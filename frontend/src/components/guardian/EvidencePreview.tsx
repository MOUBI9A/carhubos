"use client";

import React, { useState } from "react";
import { Camera, Film, ExternalLink } from "lucide-react";
import api from "@/lib/api";
import { guardianError, niceLabel, type GuardianEvidence } from "./types";

export function EvidencePreview({
  evidence,
  reportId,
  side,
}: {
  evidence: GuardianEvidence;
  reportId: string;
  side: "staff" | "customer";
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const reveal = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get<{ url: string }>(
        "/guardian/" +
          side +
          "/reports/" +
          reportId +
          "/media/" +
          evidence.id +
          "/url",
      );
      setUrl(data.url);
    } catch (e) {
      setError(guardianError(e));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="border border-hairline rounded-xl p-3 space-y-2 bg-surface-raised/40 min-w-0">
      <div className="flex items-center gap-2 text-xs text-text-muted">
        {evidence.kind === "VIDEO" ? <Film size={15} /> : <Camera size={15} />}
        <span className="font-medium">{niceLabel(evidence.kind)}</span>
      </div>
      {url ? (
        evidence.mimeType === "video/mp4" ? (
          <video
            controls
            playsInline
            preload="metadata"
            src={url}
            className="rounded-lg w-full max-h-64 bg-black"
          />
        ) : (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            title="Open full-size evidence"
          >
            {/* Time-limited signed URL to a private, access-checked asset. */}
            <img
              src={url}
              alt={niceLabel(evidence.kind) + " evidence"}
              className="rounded-lg w-full max-h-60 object-contain bg-black/10"
            />
            <span className="text-xs text-primary inline-flex items-center gap-1 mt-1">
              View full size <ExternalLink size={12} />
            </span>
          </a>
        )
      ) : (
        <button
          type="button"
          onClick={reveal}
          disabled={loading}
          className="rounded-lg w-full p-4 bg-surface text-sm text-foreground hover:bg-surface-raised border border-border"
        >
          {loading ? "Loading evidence…" : "View photo or video"}
        </button>
      )}
      {error && (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
      <p className="text-[10px] text-text-faint font-mono truncate">
        Original SHA-256: {evidence.sha256?.slice(0, 16)}…
      </p>
    </div>
  );
}
