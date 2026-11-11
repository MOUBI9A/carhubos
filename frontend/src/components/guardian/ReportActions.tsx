"use client";

import { useEffect, useState } from "react";
import { Download, MessageCircle } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { guardianError, type GuardianReport } from "./types";

type NotificationPreview = {
  recipient: string;
  state?: string;
  reason?: string;
};
type NotificationResult = {
  state:
    | "SIMULATED"
    | "UNCONFIGURED"
    | "FAILED"
    | "PROVIDER_ACCEPTED"
    | "IN_PROGRESS";
  revision: number;
  duplicate?: boolean;
  acceptanceUnknown?: boolean;
};

const notificationMessages: Record<NotificationResult["state"], string> = {
  SIMULATED: "Simulation only. No WhatsApp message was sent.",
  UNCONFIGURED:
    "WhatsApp is not configured for this agency. No message was sent.",
  FAILED: "The WhatsApp request failed. Delivery is not confirmed.",
  PROVIDER_ACCEPTED:
    "Twilio accepted the request. Delivery and reading are not confirmed.",
  IN_PROGRESS:
    "A request is already in progress or its outcome is unknown. Do not resend; delivery is not confirmed.",
};

/** Exports stay authenticated; notifications require an explicit customer confirmation. */
export function ReportActions({
  report,
  customer,
}: {
  report: GuardianReport;
  customer: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<NotificationPreview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const base = `/guardian/${customer ? "customer" : "staff"}/reports/${encodeURIComponent(report.id)}`;

  useEffect(() => {
    if (customer || report.status === "DRAFT") return;
    let live = true;
    api
      .get<NotificationPreview>(base + "/notifications/whatsapp")
      .then(({ data }) => {
        if (live) setPreview(data);
      })
      .catch((e) => {
        if (live) setPreviewError(guardianError(e));
      });
    return () => {
      live = false;
    };
  }, [base, customer, report.status]);

  async function download() {
    setBusy(true);
    setError("");
    setNotice("");
    let url: string | undefined;
    try {
      const { data, headers } = await api.get<Blob>(base + "/pdf", {
        responseType: "blob",
        timeout: 60000,
      });
      if (!String(headers["content-type"] ?? "").includes("application/pdf")) {
        throw new Error("The server did not return a PDF report.");
      }
      url = URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      const disposition = String(headers["content-disposition"] ?? "");
      const filename = /filename="([a-zA-Z0-9._-]+\.pdf)"/.exec(
        disposition,
      )?.[1];
      anchor.download =
        filename ?? `guardian-${report.id.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setNotice(
        "PDF downloaded. Its revision and approval status are recorded inside the document.",
      );
    } catch (e) {
      // Axios returns JSON error responses as a Blob when downloading a file.
      const body = (e as { response?: { data?: unknown } })?.response?.data;
      if (body instanceof Blob && typeof body.text === "function") {
        try {
          const detail = JSON.parse(await body.text());
          setError(guardianError({ response: { data: detail } }));
        } catch {
          setError(guardianError(e));
        }
      } else setError(guardianError(e));
    } finally {
      // Allow the browser to start consuming the object URL before revoking it.
      if (url) setTimeout(() => URL.revokeObjectURL(url!), 1000);
      setBusy(false);
    }
  }

  async function notify() {
    setBusy(true);
    setError("");
    setNotice("");
    setConfirmed(false);
    try {
      const { data } = await api.post<NotificationResult>(
        base + "/notifications/whatsapp",
        {
          revision: report.revision,
        },
      );
      const message = notificationMessages[data.state];
      if (!message)
        throw new Error(
          "Unknown notification outcome. Delivery is not confirmed.",
        );
      setNotice(
        (data.duplicate ? "Existing request: " : "") +
          (data.acceptanceUnknown
            ? "The provider outcome is unknown. Do not resend automatically; delivery is not confirmed."
            : message),
      );
    } catch (e) {
      setError(guardianError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-hairline pt-4">
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => void download()}
      >
        <Download size={15} aria-hidden="true" /> Download inspection PDF
      </Button>
      {!customer && report.status !== "DRAFT" && (
        <div className="space-y-3 text-sm">
          <p className="text-text-muted">
            WhatsApp shares an authenticated report link with the booking
            customer.
          </p>
          {preview && (
            <>
              <label className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  I authorize this agency to notify the booking customer (
                  {preview.recipient}) about revision {report.revision}.
                </span>
              </label>
              <Button
                type="button"
                variant="outline"
                disabled={busy || !confirmed}
                onClick={() => void notify()}
              >
                <MessageCircle size={15} aria-hidden="true" /> Send report via
                WhatsApp
              </Button>
            </>
          )}
          {previewError && (
            <p className="text-text-muted">
              WhatsApp unavailable: {previewError}
            </p>
          )}
        </div>
      )}
      {busy && (
        <p role="status" className="text-sm text-text-muted">
          Preparing report action…
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-foreground">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
