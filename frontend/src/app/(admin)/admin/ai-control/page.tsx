"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, BrainCircuit, LockKeyhole, ShieldCheck } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";

type Policy = {
  emergencyDisabled: boolean;
  revision: number;
  effectiveInferenceEnabled: false;
  providerIntegrationReady: false;
};
type AgencyRequest = {
  agencyId: string;
  requestedEnabled: boolean;
  platformApproved: boolean;
  revision: number;
  preferredLanguage: string;
  monthlyBudgetUsdCents: number;
  monthlyRequestLimit: number;
  agency: {
    name: string;
    status: string;
    aiPlatformReviews?: { decision: "APPROVE" | "REJECT" | "REVOKE"; revision: number }[];
  };
};

const reasonIsValid = (value: string) =>
  value.trim().length >= 12 && value.length <= 400;

export default function AiPlatformControlPage() {
  const t = useTranslations("aiPlatform");
  const { role } = useAuth();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [requests, setRequests] = useState<AgencyRequest[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string>("");
  const [policyReason, setPolicyReason] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const [policyResult, requestsResult] = await Promise.all([
        api.get<Policy>("/saas-admin/ai-control/policy"),
        api.get<AgencyRequest[]>("/saas-admin/ai-control/requests"),
      ]);
      setPolicy(policyResult.data);
      setRequests(requestsResult.data);
      setSelectedAgency((previous) =>
        requestsResult.data.some((request) => request.agencyId === previous) ? previous : ""
      );
    } catch {
      setPolicy(null);
      setRequests([]);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (role === "ROOT_ADMIN") void load();
    else setLoading(false);
  }, [role, load]);

  async function updatePolicy() {
    if (!policy || !reasonIsValid(policyReason) || busy || role !== "ROOT_ADMIN") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.patch<Policy>("/saas-admin/ai-control/policy", {
        expectedRevision: policy.revision,
        emergencyDisabled: !policy.emergencyDisabled,
        reason: policyReason.trim(),
      });
      setPolicy(data);
      setPolicyReason("");
      setMessage(t("policySaved"));
    } catch {
      setError(t("changeError"));
    } finally {
      setBusy(false);
    }
  }

  async function reviewAgency(approve: boolean) {
    const selected = requests.find((request) => request.agencyId === selectedAgency);
    if (!selected || !reasonIsValid(reviewReason) || busy || role !== "ROOT_ADMIN") return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.patch<{
        agencyId: string; platformApproved: boolean;
        decision: "APPROVE" | "REJECT" | "REVOKE"; revision: number;
      }>(`/saas-admin/ai-control/agencies/${encodeURIComponent(selected.agencyId)}/review`, {
        expectedRevision: selected.revision,
        approve,
        reason: reviewReason.trim(),
      });
      // A separate read after commit can fail or return a later revision.
      // Apply the exact state confirmed by the successful review transaction.
      setRequests((current) => current.map((item) => item.agencyId === data.agencyId
        ? {
          ...item, platformApproved: data.platformApproved, revision: data.revision,
          agency: { ...item.agency, aiPlatformReviews: [
            { decision: data.decision, revision: data.revision },
          ] },
        } : item));
      setReviewReason("");
      setMessage(t("reviewSaved"));
    } catch {
      setError(t("changeError"));
    } finally {
      setBusy(false);
    }
  }

  if (role !== "ROOT_ADMIN") {
    return <p role="alert" className="p-6 text-sm text-danger">{t("forbidden")}</p>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-7 pb-20">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-foreground">
          <BrainCircuit className="h-7 w-7 text-primary" aria-hidden="true" />{t("title")}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-text-muted">{t("description")}</p>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-hairline bg-surface p-5">
        <LockKeyhole className="h-5 w-5 shrink-0 text-primary" aria-hidden="true"/>
        <p className="text-sm leading-relaxed text-text-muted">{t("noModel")}</p>
      </div>

      {loading && <p role="status" className="text-sm text-text-muted">{t("loading")}</p>}
      {error && <p role="alert" className="rounded-xl border border-hairline p-4 text-sm text-danger">{error}</p>}
      {message && <p role="status" className="text-sm text-success">{message}</p>}
      {!loading && policy && <>
        <section className="space-y-5 rounded-2xl border border-hairline bg-surface p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true"/>{t("policyTitle")}
            </h2>
            <span className="rounded-full border border-hairline px-3 py-1 text-xs font-semibold text-foreground">
              {policy.emergencyDisabled ? t("switchLocked") : t("switchCleared")}
            </span>
          </div>
          <p className="text-sm text-text-muted">{t("policyDetails")}</p>
          <p className="text-xs text-text-muted">{t("revision")} {policy.revision}</p>
          <label htmlFor="ai-global-reason" className="block space-y-2 text-sm text-foreground">
            <span className="block font-medium">{t("reason")}</span>
            <textarea id="ai-global-reason" value={policyReason}
              onChange={(event) => setPolicyReason(event.target.value)}
              disabled={busy} rows={3} maxLength={400} placeholder={t("reasonHint")}
              className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"/>
          </label>
          <button type="button" onClick={() => void updatePolicy()}
            disabled={!reasonIsValid(policyReason) || busy}
            className="rounded-xl border border-hairline bg-surface-raised px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary">
            {policy.emergencyDisabled ? t("clearEmergency") : t("engageEmergency")}
          </button>
        </section>

        <section className="space-y-5 rounded-2xl border border-hairline bg-surface p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Activity className="h-5 w-5 text-primary" aria-hidden="true"/>{t("requestsTitle")}
          </h2>
          <p className="text-sm text-text-muted">{t("requestsDetails")}</p>
          {requests.length === 0 ? <p className="text-sm text-text-muted">{t("noRequests")}</p> : <>
            <label htmlFor="ai-review-agency" className="block space-y-2 text-sm text-foreground">
              <span className="block font-medium">{t("selectAgency")}</span>
              <select id="ai-review-agency" value={selectedAgency}
                onChange={(event) => {
                  setSelectedAgency(event.target.value);
                  setReviewReason("");
                }}
                disabled={busy}
                className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                <option value="">{t("chooseAgency")}</option>
                {requests.map((request) => <option value={request.agencyId} key={request.agencyId}>
                  {request.agency.name}
                </option>)}
              </select>
            </label>
            {requests.filter((request) => request.agencyId === selectedAgency).map((request) => (
              <div key={request.agencyId} className="space-y-4 rounded-xl border border-hairline bg-surface-raised p-5">
                <p className="text-sm font-semibold text-foreground">{request.agency.name}</p>
                <p className="text-sm text-text-muted">
                  {t("approval")}: {
                    request.platformApproved ? t("approved") :
                    request.agency.aiPlatformReviews?.[0]?.revision === request.revision
                      ? request.agency.aiPlatformReviews[0].decision === "REJECT"
                        ? t("rejected") : t("revoked")
                      : t("notApproved")
                  }
                  {" · "}{t("limit")}: {request.monthlyRequestLimit}
                  {" · "}{t("budget")}: ${(request.monthlyBudgetUsdCents / 100).toFixed(0)}/month
                </p>
                <p className="text-xs text-text-muted">{t("revision")} {request.revision}</p>
                <label htmlFor="ai-agency-reason" className="block space-y-2 text-sm text-foreground">
                  <span className="block font-medium">{t("reason")}</span>
                  <textarea id="ai-agency-reason" value={reviewReason}
                    onChange={(event) => setReviewReason(event.target.value)}
                    disabled={busy} rows={3} maxLength={400} placeholder={t("reasonHint")}
                    className="w-full rounded-lg border border-hairline bg-surface p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"/>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={() => void reviewAgency(true)}
                    disabled={busy || !reasonIsValid(reviewReason) || request.platformApproved || request.agency.status !== "ACTIVE" || !request.monthlyRequestLimit || !request.monthlyBudgetUsdCents}
                    className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary">
                    {t("approve")}
                  </button>
                  <button type="button" onClick={() => void reviewAgency(false)}
                    disabled={busy || !reasonIsValid(reviewReason)}
                    className="rounded-xl border border-hairline px-4 py-3 text-sm font-semibold text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary">
                    {request.platformApproved ? t("revoke") : t("reject")}
                  </button>
                </div>
              </div>
            ))}
          </>}
        </section>
        <div className="flex items-start gap-2 text-xs leading-relaxed text-text-muted">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true"/>{t("warning")}
        </div>
      </>}
    </main>
  );
}
