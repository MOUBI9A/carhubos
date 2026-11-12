"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, Camera, ArrowRight, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { EvidencePreview } from "./EvidencePreview";
import { ReportActions } from "./ReportActions";
import { VideoUpload } from "./VideoUpload";
import {
  CAR_ZONES,
  guardianError,
  niceLabel,
  type EvidenceKind,
  type GuardianFinding,
  type GuardianReport,
} from "./types";

const field =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary";
const panel =
  "rounded-2xl border border-hairline bg-surface p-5 md:p-6 space-y-4";
type ActiveFinding = GuardianFinding & {
  report: { id: string; bookingId: string; phase: string };
};
type BookingOption = {
  id: string;
  status: string;
  startDate: string;
  car?: { brand: string; model: string; licensePlate: string };
  customer?: { firstName: string; lastName: string };
};

/** Both staff routes share one workspace; the server remains the permission boundary. */
export function GuardianWorkspace({
  customer = false,
}: {
  customer?: boolean;
}) {
  const side = customer ? "customer" : "staff";
  const base = "/guardian/" + side;
  const [bookingId, setBookingId] = useState("");
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([]);
  const [lookupId, setLookupId] = useState("");
  const [reports, setReports] = useState<GuardianReport[]>([]);
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [active, setActive] = useState<ActiveFinding[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);

  // A refresh failure is surfaced separately: a successful write must never be reported as a failed write.
  async function refresh(id?: string, booking = lookupId) {
    if (customer)
      setReports((await api.get<GuardianReport[]>(base + "/reports")).data);
    else if (booking)
      setReports(
        (
          await api.get<GuardianReport[]>(
            base + "/booking/" + encodeURIComponent(booking),
          )
        ).data,
      );
    if (id) {
      const current = (await api.get<GuardianReport>(base + "/reports/" + id))
        .data;
      setReport(current);
      if (!customer)
        setActive(
          (
            await api.get<ActiveFinding[]>(
              base + "/cars/" + current.carId + "/active-damage",
            )
          ).data,
        );
    }
    setLoaded(true);
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(guardianError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (customer) {
      const linkedReport = new URLSearchParams(window.location.search).get(
        "reportId",
      );
      void run(() => refresh(linkedReport || undefined));
    }
  }, [customer]);
  // Staff can select an actual booking instead of copying opaque UUIDs.
  // The existing text input remains available for older bookings beyond this page.
  useEffect(() => {
    if (customer) return;
    let live = true;
    api
      .get<BookingOption[] | { items: BookingOption[] }>(
        "/bookings?page=1&pageSize=50",
      )
      .then(({ data }) => {
        if (live)
          setBookingOptions(Array.isArray(data) ? data : (data.items ?? []));
      })
      .catch(() => {
        // Leave manual lookup operational if the recent-bookings request fails.
        if (live) setBookingOptions([]);
      });
    return () => {
      live = false;
    };
  }, [customer]);
  async function mutate(path: string, data: unknown, message: string) {
    if (!report) return;
    await api.post(base + "/reports/" + report.id + path, {
      ...(data as Record<string, unknown>),
      revision: report.revision,
    });
    setNotice(message);
    try {
      await refresh(report.id);
    } catch (e) {
      setError("Saved, but refresh failed: " + guardianError(e));
    }
  }
  const reviewOpen =
    report &&
    ["CUSTOMER_REVIEW", "CORRECTIONS_PENDING", "DISPUTED"].includes(
      report.status,
    );
  const canAdd =
    report &&
    (customer
      ? reviewOpen
      : ["DRAFT", "CORRECTIONS_PENDING"].includes(report.status));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <header className="rounded-3xl border border-hairline bg-gradient-to-br from-surface-raised to-background p-6 md:p-9 flex gap-5 items-start">
        <span className="p-3 rounded-2xl bg-primary/10 text-primary">
          <ShieldCheck size={30} aria-hidden="true" />
        </span>
        <div>
          <p className="eyebrow text-text-muted">Fider · Condition & trust</p>
          <h1 className="font-display text-3xl md:text-4xl mt-2">
            Guardian Vision
          </h1>
          <p className="text-text-muted mt-3 max-w-xl">
            {customer
              ? "Review your vehicle together. Add anything missing before approving the same report revision."
              : "A shared vehicle condition record. Capture the evidence, resolve findings, and request customer approval."}
          </p>
          <p className="text-xs text-text-faint mt-3">
            Pilot · Human review · Photos up to 8 MiB · Staff MP4 video up to 150 MiB
          </p>
        </div>
      </header>
      <div aria-live="polite" className="space-y-2">
        {busy && (
          <p role="status" className="text-sm text-text-muted">
            Working…
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="border border-danger/30 rounded-xl bg-danger/10 p-4 text-danger break-words"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="border border-primary/30 rounded-xl p-4 text-foreground"
          >
            {notice}
          </p>
        )}
      </div>
      <fieldset disabled={busy} className="space-y-6 min-w-0">
        {!customer && (
          <section className={panel}>
            <h2 className="font-display text-xl">Find a booking</h2>
            {bookingOptions.length > 0 && (
              <label className="block text-sm">
                Choose a recent reservation
                <select
                  aria-label="Choose recent booking"
                  className={field + " mt-2"}
                  value={
                    bookingOptions.some((b) => b.id === bookingId)
                      ? bookingId
                      : ""
                  }
                  onChange={(e) => setBookingId(e.target.value)}
                >
                  <option value="">
                    Select a booking, or paste its ID below
                  </option>
                  {bookingOptions.map((b) => (
                    <option key={b.id} value={b.id}>
                      {(b.car?.brand ?? "Vehicle") +
                        " " +
                        (b.car?.model ?? "") +
                        " · " +
                        (b.car?.licensePlate ?? b.id.slice(0, 8)) +
                        " · " +
                        (b.customer?.firstName ?? "") +
                        " " +
                        (b.customer?.lastName ?? "")}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <form
              className="flex flex-col sm:flex-row gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(async () => {
                  setReport(null);
                  setActive([]);
                  setReports([]);
                  setLoaded(false);
                  await refresh(undefined, bookingId.trim());
                  setLookupId(bookingId.trim());
                });
              }}
            >
              <label className="flex-1 text-sm">
                Booking ID
                <input
                  required
                  value={bookingId}
                  onChange={(e) => setBookingId(e.target.value)}
                  className={field + " mt-2"}
                  placeholder="Paste the booking ID"
                />
              </label>
              <Button className="sm:self-end" type="submit">
                Look up booking <ArrowRight size={16} />
              </Button>
            </form>
            <p className="text-xs text-text-muted">
              Use the booking ID from your reservations. Access is limited to
              your agency.
            </p>
          </section>
        )}
        {customer && (
          <Button
            variant="outline"
            onClick={() => void run(() => refresh(report?.id))}
          >
            <RefreshCw size={15} /> Refresh reports
          </Button>
        )}
        {loaded && (
          <section className={panel}>
            <h2 className="font-display text-xl">
              {customer ? "Your inspections" : "Booking inspections"}
            </h2>
            {reports.length === 0 && (
              <p className="text-text-muted text-sm">
                {customer
                  ? "No published inspections are available for your bookings."
                  : "No inspection created for this booking yet."}
              </p>
            )}
            <div className="grid sm:grid-cols-2 gap-3">
              {reports.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => void run(() => refresh(r.id))}
                  className={
                    "text-start rounded-xl border p-4 hover:border-primary " +
                    (r.id === report?.id
                      ? "border-primary bg-primary/5"
                      : "border-border")
                  }
                >
                  <span className="text-sm font-semibold">
                    {r.phase === "OUT" ? "Departure" : "Return"} ·{" "}
                    {niceLabel(r.status)}
                  </span>
                  {r.car && (
                    <span className="block text-sm mt-1">
                      {r.car.brand} {r.car.model} · {r.car.licensePlate}
                    </span>
                  )}
                  <span className="block text-xs text-text-muted mt-2">
                    Revision {r.revision} · {r.mileage.toLocaleString()} km ·
                    Fuel {r.fuelLevel}/8
                  </span>
                </button>
              ))}
            </div>
            {!customer && lookupId && (
              <CreateReport
                bookingId={lookupId}
                existing={reports}
                onCreate={(data) =>
                  run(async () => {
                    const created = (
                      await api.post<GuardianReport>(base + "/reports", data)
                    ).data;
                    setNotice(
                      "Inspection created. Add evidence before publishing.",
                    );
                    await refresh(created.id);
                  })
                }
              />
            )}
          </section>
        )}
        {report && (
          <>
            <section className={panel}>
              <div className="flex flex-wrap justify-between items-start gap-3">
                <div>
                  <p className="eyebrow text-primary">
                    {niceLabel(report.mode)} inspection · Revision{" "}
                    {report.revision}
                  </p>
                  <h2 className="font-display text-2xl mt-2">
                    {report.phase === "OUT" ? "Departure" : "Return"} condition
                    record
                  </h2>
                </div>
                <span className="rounded-full border border-primary/30 px-3 py-1 text-xs">
                  {niceLabel(report.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-text-muted">Mileage</p>
                  <p className="font-mono mt-1">
                    {report.mileage.toLocaleString()} km
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Fuel</p>
                  <p className="font-mono mt-1">{report.fuelLevel}/8</p>
                </div>
                <div>
                  <p className="text-text-muted">Agency approval</p>
                  <p className="mt-1">
                    {report.agencyApprovedRevision
                      ? "Revision " + report.agencyApprovedRevision
                      : "Pending"}
                  </p>
                </div>
                <div>
                  <p className="text-text-muted">Customer approval</p>
                  <p className="mt-1">
                    {report.customerApprovedRevision
                      ? "Revision " + report.customerApprovedRevision
                      : "Pending"}
                  </p>
                </div>
              </div>
              <p className="text-xs text-text-faint break-all">
                Booking {report.bookingId} · Report {report.id}
              </p>
              <Button
                variant="outline"
                onClick={() => void run(() => refresh(report.id))}
              >
                <RefreshCw size={15} /> Refresh this report
              </Button>
              <ReportActions
                key={`${report.id}-${report.revision}-${report.status}`}
                report={report}
                customer={customer}
              />
            </section>
            <section className={panel}>
              <h2 className="font-display text-xl">Evidence locker</h2>
              <p className="text-sm text-text-muted">
                {customer
                  ? "Open each photo or video to review the originals."
                  : "Overview, odometer and fuel photos are required. Full mode also requires a walkaround MP4. Close-ups support individual findings."}
              </p>
              {((!customer && report.status === "DRAFT") ||
                canAdd ||
                (!customer && report.status === "MUTUALLY_APPROVED")) && (
                <UploadEvidence
                  kinds={
                    customer
                      ? ["DAMAGE"]
                      : report.status === "MUTUALLY_APPROVED"
                        ? ["REPAIR"]
                        : report.status === "DRAFT"
                          ? ["OVERVIEW", "ODOMETER", "FUEL", "DAMAGE"]
                          : ["DAMAGE"]
                  }
                  upload={(kind, file) =>
                    run(async () => {
                      const data = new FormData();
                      data.append("kind", kind);
                      data.append("file", file);
                      data.append("revision", String(report.revision));
                      await api.post(
                        base + "/reports/" + report.id + "/evidence",
                        data,
                        { timeout: 120000 },
                      );
                      setNotice(
                        "Evidence uploaded. Link a close-up to a finding below.",
                      );
                      try {
                        await refresh(report.id);
                      } catch (e) {
                        setError(
                          "Uploaded, but refresh failed: " + guardianError(e),
                        );
                      }
                    })
                  }
                />
              )}
              {!customer && (
                <VideoUpload
                  key={report.id}
                  report={report}
                  refresh={() => refresh(report.id)}
                />
              )}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.evidence.map((media) => (
                  <EvidencePreview
                    key={media.id}
                    evidence={media}
                    reportId={report.id}
                    side={side}
                  />
                ))}
              </div>
              {!report.evidence.length && (
                <p className="text-sm text-text-muted">No evidence uploaded.</p>
              )}
            </section>
            <section className={panel}>
              <h2 className="font-display text-xl">
                Findings & customer proposals
              </h2>
              {canAdd && (
                <FindingForm
                  report={report}
                  customer={customer}
                  submit={(data) =>
                    run(() =>
                      mutate(
                        "/findings",
                        data,
                        customer
                          ? "Finding proposed. Agency review is required."
                          : "Finding added.",
                      ),
                    )
                  }
                />
              )}
              {!report.findings.length && (
                <p className="text-sm text-text-muted">No findings recorded.</p>
              )}
              {report.findings.map((f) => (
                <article
                  className="border border-border rounded-xl p-4 space-y-3"
                  key={f.id}
                >
                  <div className="flex flex-wrap gap-2 justify-between">
                    <h3 className="font-semibold">
                      {niceLabel(f.zone)} · {f.kind}
                    </h3>
                    <span className="text-xs text-primary">
                      {niceLabel(f.status)} · {niceLabel(f.source)}
                    </span>
                  </div>
                  <p className="text-sm text-text-muted whitespace-pre-wrap">
                    {f.description}
                  </p>
                  {f.agencyNote && (
                    <p className="text-sm">Agency reason: {f.agencyNote}</p>
                  )}
                  <div className="grid sm:grid-cols-2 gap-3">
                    {f.photo && (
                      <EvidencePreview
                        evidence={f.photo}
                        reportId={report.id}
                        side={side}
                      />
                    )}
                    {f.repairPhoto && (
                      <EvidencePreview
                        evidence={f.repairPhoto}
                        reportId={report.id}
                        side={side}
                      />
                    )}
                  </div>
                  {f.video && (
                    <>
                      <p className="text-xs text-text-muted">
                        Walkaround reference: {f.videoOffsetSec ?? 0} seconds
                      </p>
                      <EvidencePreview
                        evidence={f.video}
                        reportId={report.id}
                        side={side}
                      />
                    </>
                  )}
                  {!customer &&
                    f.source === "CUSTOMER" &&
                    ["PROPOSED", "DISPUTED"].includes(f.status) &&
                    ["CORRECTIONS_PENDING", "DISPUTED"].includes(
                      report.status,
                    ) && (
                      <DecisionForm
                        submit={(decision, note) =>
                          run(() =>
                            mutate(
                              "/findings/" + f.id + "/decision",
                              { decision, note },
                              "Proposal decision recorded.",
                            ),
                          )
                        }
                      />
                    )}
                  {!customer &&
                    f.status === "ACCEPTED" &&
                    !f.repairedAt &&
                    report.status === "MUTUALLY_APPROVED" && (
                      <RepairForm
                        report={report}
                        submit={(photoId) =>
                          run(() =>
                            mutate(
                              "/findings/" + f.id + "/repair",
                              { photoId },
                              "Repair evidence recorded. This defect is no longer active.",
                            ),
                          )
                        }
                      />
                    )}
                  {f.repairedAt && (
                    <p className="text-xs text-text-muted">
                      Repair recorded {new Date(f.repairedAt).toLocaleString()}
                    </p>
                  )}
                </article>
              ))}
            </section>
            <section className={panel}>
              <h2 className="font-display text-xl">Mutual review</h2>
              <p className="text-sm text-text-muted">
                Approval applies to revision {report.revision}. New findings
                invalidate previous approvals. Review all evidence before
                continuing.
              </p>
              {!customer &&
                ["DRAFT", "CORRECTIONS_PENDING"].includes(report.status) && (
                  <Button
                    onClick={() =>
                      void run(() =>
                        mutate(
                          "/publish",
                          { revision: report.revision },
                          "Published for customer review.",
                        ),
                      )
                    }
                  >
                    Publish & approve revision {report.revision}
                  </Button>
                )}
              {!customer && report.status === "DISPUTED" && (
                <ReasonForm
                  label="Resolution / next review steps"
                  button="Reopen for corrections"
                  submit={(note) =>
                    run(() =>
                      mutate(
                        "/reopen",
                        { note, revision: report.revision },
                        "Reopened for corrections. Resolve proposals and publish again.",
                      ),
                    )
                  }
                />
              )}
              {customer && report.status === "CUSTOMER_REVIEW" && (
                <div className="space-y-4">
                  <ApprovalForm
                    key={`${report.id}-${report.revision}`}
                    revision={report.revision}
                    submit={() =>
                      run(() =>
                        mutate(
                          "/approve",
                          { revision: report.revision },
                          "You approved this revision. The inspection is mutually approved.",
                        ),
                      )
                    }
                  />
                  <ReasonForm
                    label="Dispute reason"
                    button="Dispute report"
                    submit={(note) =>
                      run(() =>
                        mutate(
                          "/dispute",
                          { note, revision: report.revision },
                          "Dispute recorded. Agency review is required.",
                        ),
                      )
                    }
                  />
                </div>
              )}
              {report.status === "MUTUALLY_APPROVED" && (
                <p className="text-primary">
                  Both parties approved revision {report.revision}. The
                  condition baseline is sealed.
                </p>
              )}
              {["CORRECTIONS_PENDING", "DISPUTED"].includes(report.status) && (
                <p className="text-sm text-text-muted">
                  Corrections or a dispute are pending. Approval is unavailable
                  until the agency republishes.
                </p>
              )}
            </section>
            {!customer && (
              <section className={panel}>
                <h2 className="font-display text-xl">
                  Accepted active defects · vehicle history
                </h2>
                <p className="text-sm text-text-muted">
                  Unrepaired findings from mutually approved reports across this
                  vehicle’s bookings.
                </p>
                {!active.length && (
                  <p className="text-sm">No active accepted defects.</p>
                )}
                {active.map((f) => (
                  <div
                    key={f.id}
                    className="border border-border rounded-xl p-3 flex flex-wrap justify-between gap-2"
                  >
                    <span>
                      {niceLabel(f.zone)} · {f.kind}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void run(() => refresh(f.report.id))}
                    >
                      Open report to review / repair
                    </Button>
                  </div>
                ))}
              </section>
            )}
            <section className={panel}>
              <h2 className="font-display text-xl">Review history</h2>
              <ol className="space-y-3">
                {report.events.map((event) => (
                  <li
                    key={event.id}
                    className="border-s-2 border-primary/30 ps-4 text-sm"
                  >
                    <p>
                      {niceLabel(event.action)} · {niceLabel(event.actorRole)} ·
                      Revision {event.revision}
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(event.createdAt).toLocaleString()}
                    </p>
                    {event.details?.note && (
                      <p className="text-text-muted mt-1 whitespace-pre-wrap">
                        {event.details.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </fieldset>
    </div>
  );
}

function CreateReport({
  bookingId,
  existing,
  onCreate,
}: {
  bookingId: string;
  existing: GuardianReport[];
  onCreate: (data: unknown) => Promise<void>;
}) {
  return (
    <form
      className="border-t border-hairline pt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        void onCreate({
          bookingId,
          phase: data.get("phase"),
          mode: data.get("mode"),
          mileage: Number(data.get("mileage")),
          fuelLevel: Number(data.get("fuel")),
        });
      }}
    >
      <h3 className="font-semibold">Create condition record</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="text-sm">
          Phase
          <select name="phase" className={field}>
            {["OUT", "IN"].map((p) => (
              <option
                key={p}
                disabled={existing.some((r) => r.phase === p)}
                value={p}
              >
                {p === "OUT" ? "Departure (OUT)" : "Return (IN)"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Capture mode
          <select name="mode" className={field}>
            <option value="FULL">Full · with video</option>
            <option value="QUICK">Quick · photos only</option>
          </select>
        </label>
        <label className="text-sm">
          Mileage (km)
          <input
            name="mileage"
            type="number"
            min="0"
            max="2147483647"
            step="1"
            required
            className={field}
          />
        </label>
        <label className="text-sm">
          Fuel (eighths)
          <input
            name="fuel"
            type="number"
            min="0"
            max="8"
            step="1"
            required
            className={field}
          />
        </label>
      </div>
      <Button disabled={existing.length >= 2}>Create inspection</Button>
    </form>
  );
}
function UploadEvidence({
  kinds,
  upload,
}: {
  kinds: EvidenceKind[];
  upload: (kind: EvidenceKind, file: File) => Promise<void>;
}) {
  const [kind, setKind] = useState<EvidenceKind>(kinds[0]);
  const selected = kinds.includes(kind) ? kind : kinds[0];
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  return (
    <form
      className="rounded-xl border border-dashed border-border p-4 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return;
        if (file.size > (selected === "VIDEO" ? 32 : 8) * 1048576) {
          setError("File exceeds the pilot limit. Choose a smaller file.");
          return;
        }
        setError("");
        void upload(selected, file);
      }}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Evidence type
          <select
            className={field}
            value={selected}
            onChange={(e) => {
              setKind(e.target.value as EvidenceKind);
              setFile(null);
            }}
          >
            {kinds.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Capture or choose file
          <input
            key={selected}
            type="file"
            required
            accept={
              selected === "VIDEO"
                ? "video/mp4"
                : "image/jpeg,image/png,image/webp"
            }
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={field}
          />
        </label>
      </div>
      <p className="text-xs text-text-muted">
        On mobile, choose the camera when your device offers it. Video must be
        MP4; convert other formats before uploading.
      </p>
      {error && (
        <p role="alert" className="text-danger text-sm">
          {error}
        </p>
      )}
      <Button variant="outline">
        <Camera size={16} /> Upload evidence
      </Button>
    </form>
  );
}
function FindingForm({
  report,
  customer,
  submit,
}: {
  report: GuardianReport;
  customer: boolean;
  submit: (data: unknown) => Promise<void>;
}) {
  return (
    <form
      className="space-y-3 border border-dashed border-border p-4 rounded-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        void submit({
          zone: data.get("zone"),
          kind: data.get("kind"),
          description: data.get("description"),
          photoId: data.get("photoId"),
          ...(data.get("videoId")
            ? {
                videoId: data.get("videoId"),
                videoOffsetSec: Number(data.get("offset") || 0),
              }
            : {}),
        });
      }}
    >
      <h3 className="font-semibold text-sm">
        {customer ? "Add a missing finding" : "Add a damage item"}
      </h3>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="text-sm">
          Vehicle zone
          <select name="zone" className={field}>
            {CAR_ZONES.map((z) => (
              <option key={z} value={z}>
                {niceLabel(z)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Damage type
          <input
            name="kind"
            required
            minLength={2}
            maxLength={60}
            placeholder="e.g. Scratch"
            className={field}
          />
        </label>
        <label className="text-sm">
          Linked close-up photo
          <select name="photoId" required className={field} defaultValue="">
            <option value="" disabled>
              Choose your uploaded damage photo
            </option>
            {report.evidence
              .filter(
                (e) =>
                  e.kind === "DAMAGE" &&
                  e.uploadedByRole === (customer ? "CUSTOMER" : "AGENCY") &&
                  !report.findings.some((f) => f.photoId === e.id),
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.filename} · {e.id.slice(0, 8)}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Walkaround video (optional)
          <select name="videoId" className={field}>
            <option value="">No video reference</option>
            {report.evidence
              .filter((e) => e.kind === "VIDEO")
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.filename}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm">
          Video timestamp (seconds)
          <input
            name="offset"
            type="number"
            min="0"
            step="1"
            max="2147483647"
            className={field}
          />
        </label>
        <label className="text-sm">
          Description
          <textarea name="description" maxLength={1000} className={field} />
        </label>
      </div>
      <Button variant="outline">
        {customer ? "Propose finding" : "Add finding"}
      </Button>
    </form>
  );
}
function DecisionForm({
  submit,
}: {
  submit: (decision: string, note?: string) => Promise<void>;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Agency review reason
        <textarea
          value={note}
          maxLength={2000}
          onChange={(e) => setNote(e.target.value)}
          className={field}
        />
      </label>
      <div className="flex gap-3">
        <Button
          type="button"
          size="sm"
          onClick={() => void submit("ACCEPT", note)}
        >
          Accept proposal
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!note.trim()}
          onClick={() => void submit("DISPUTE", note)}
        >
          Dispute proposal
        </Button>
      </div>
    </div>
  );
}
function ReasonForm({
  label,
  button,
  submit,
}: {
  label: string;
  button: string;
  submit: (note: string) => Promise<void>;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(String(new FormData(e.currentTarget).get("reason")).trim());
      }}
    >
      <label className="block text-sm">
        {label}
        <textarea
          name="reason"
          required
          minLength={5}
          maxLength={2000}
          className={field}
        />
      </label>
      <Button variant="outline">{button}</Button>
    </form>
  );
}
function ApprovalForm({
  revision,
  submit,
}: {
  revision: number;
  submit: () => Promise<void>;
}) {
  const [checked, setChecked] = useState(false);
  return (
    <div className="space-y-3">
      <label className="flex gap-3 text-sm items-start">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1"
        />
        I reviewed the evidence and findings for revision {revision} and agree
        with this condition record.
      </label>
      <Button disabled={!checked} onClick={() => void submit()}>
        Approve revision {revision}
      </Button>
    </div>
  );
}
function RepairForm({
  report,
  submit,
}: {
  report: GuardianReport;
  submit: (id: string) => Promise<void>;
}) {
  return (
    <form
      className="flex flex-col sm:flex-row gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(String(new FormData(e.currentTarget).get("photo")));
      }}
    >
      <label className="text-sm flex-1">
        Repair evidence photo
        <select name="photo" required defaultValue="" className={field}>
          <option value="" disabled>
            Upload a REPAIR photo, then select it
          </option>
          {report.evidence
            .filter(
              (e) =>
                e.kind === "REPAIR" &&
                !report.findings.some((f) => f.repairPhotoId === e.id),
            )
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.filename} · {e.id.slice(0, 8)}
              </option>
            ))}
        </select>
      </label>
      <Button className="sm:self-end" variant="outline">
        Record repair
      </Button>
    </form>
  );
}
