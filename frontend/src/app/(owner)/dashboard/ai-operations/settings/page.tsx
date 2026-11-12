"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { LockKeyhole, ShieldCheck, SlidersHorizontal } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/lib/contexts/AuthContext";

type Language = "EN" | "FR" | "AR";
type Settings = {
  requestedEnabled: boolean;
  preferredLanguage: Language;
  monthlyBudgetUsdCents: number;
  monthlyRequestLimit: number;
  revision: number;
  platformApproved: boolean;
  effectiveEnabled: boolean;
  humanApprovalRequired: true;
  autonomousActionsAllowed: false;
};
type Usage = {
  periodStart: string;
  recordedRequests: number;
  inputTokens: number;
  outputTokens: number;
  recordedCostUsdMicros: number;
};

export default function AiGovernanceSettingsPage() {
  const t = useTranslations("aiGovernance");
  const locale = useLocale();
  const { role } = useAuth();
  const canEdit = role === "OWNER";
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [requestedEnabled, setRequestedEnabled] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState<Language>("EN");
  const [budgetUsd, setBudgetUsd] = useState("0");
  const [requestLimit, setRequestLimit] = useState("0");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess(false);
    try {
      const [config, meter] = await Promise.all([
        api.get<Settings>("/ai-operations/settings"),
        api.get<Usage>("/ai-operations/usage"),
      ]);
      setSettings(config.data);
      setUsage(meter.data);
      setRequestedEnabled(config.data.requestedEnabled);
      setPreferredLanguage(config.data.preferredLanguage);
      setBudgetUsd(String(config.data.monthlyBudgetUsdCents / 100));
      setRequestLimit(String(config.data.monthlyRequestLimit));
    } catch {
      setSettings(null);
      setUsage(null);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void load(); }, [load]);

  const budget = Number(budgetUsd);
  const limit = Number(requestLimit);
  const valid = budgetUsd.trim() !== "" && requestLimit.trim() !== "" &&
    Number.isSafeInteger(budget) && budget >= 0 && budget <= 1000 &&
    Number.isSafeInteger(limit) && limit >= 0 && limit <= 10000;

  async function save() {
    if (!canEdit || !settings || !valid) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const { data } = await api.patch<Settings>("/ai-operations/settings", {
        expectedRevision: settings.revision,
        requestedEnabled,
        preferredLanguage,
        monthlyBudgetUsdCents: budget * 100,
        monthlyRequestLimit: limit,
      });
      setSettings(data);
      setSuccess(true);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-7 pb-20">
      <Link href="/dashboard/ai-operations" className="text-sm font-semibold text-primary underline underline-offset-4">{t("back")}</Link>
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 text-3xl font-semibold text-foreground">
          <SlidersHorizontal className="h-6 w-6 text-primary" aria-hidden="true" />{t("title")}
        </h1>
        <p className="text-sm text-text-muted">{t("description")}</p>
      </header>
      <section className="space-y-2 rounded-xl border border-hairline bg-surface p-5" aria-label={t("safetyTitle")}>
        <h2 className="flex items-center gap-2 font-semibold text-foreground">
          <LockKeyhole className="h-5 w-5" aria-hidden="true" />{t("safetyTitle")}
        </h2>
        <p className="text-sm text-text-muted">{t("safetyDetails")}</p>
      </section>
      {loading && <p role="status">{t("loading")}</p>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {!loading && settings && (
        <>
          <section className="space-y-2 rounded-xl border border-hairline bg-surface p-5">
            <h2 className="font-semibold text-foreground">{t("statusTitle")}</h2>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ShieldCheck className="h-5 w-5 text-warning" aria-hidden="true" />
              {settings.effectiveEnabled ? t("active") : t("disabled")}
            </p>
            <p className="text-sm text-text-muted">{settings.requestedEnabled ? t("pendingReview") : t("notRequested")}</p>
            <p className="text-xs text-text-muted">{t("statusDetails")}</p>
          </section>
          <section className="space-y-5 rounded-xl border border-hairline bg-surface p-5">
            <h2 className="font-semibold text-foreground">{t("controlsTitle")}</h2>
            <label className="flex gap-3 text-sm text-foreground">
              <input type="checkbox" aria-label={t("optIn")} checked={requestedEnabled} disabled={!canEdit || saving}
                onChange={(event) => setRequestedEnabled(event.target.checked)} className="mt-1 h-4 w-4 accent-primary"/>
              <span><strong className="block">{t("optIn")}</strong><span className="block text-text-muted">{t("optInNote")}</span></span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label htmlFor="ai-governance-language" className="space-y-2 text-sm text-foreground">
                <span className="block font-medium">{t("language")}</span>
                <select id="ai-governance-language" value={preferredLanguage} disabled={!canEdit || saving}
                  onChange={(event) => setPreferredLanguage(event.target.value as Language)}
                  className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary">
                  <option value="EN">English</option><option value="FR">Français</option><option value="AR">العربية</option>
                </select>
              </label>
              <label htmlFor="ai-governance-limit" className="space-y-2 text-sm text-foreground">
                <span className="block font-medium">{t("monthlyRequests")}</span>
                <input id="ai-governance-limit" type="number" min="0" max="10000" step="1"
                  value={requestLimit} disabled={!canEdit || saving} onChange={(e) => setRequestLimit(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"/>
              </label>
              <label htmlFor="ai-governance-budget" className="space-y-2 text-sm text-foreground">
                <span className="block font-medium">{t("monthlyBudget")}</span>
                <input id="ai-governance-budget" type="number" min="0" max="1000" step="1"
                  value={budgetUsd} disabled={!canEdit || saving} onChange={(e) => setBudgetUsd(e.target.value)}
                  className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"/>
              </label>
            </div>
            <p className="text-xs text-text-muted">{t("budgetNote")}</p>
            {!canEdit && <p className="text-sm text-text-muted">{t("ownerOnly")}</p>}
            {canEdit && <button type="button" disabled={saving || !valid} onClick={() => void save()}
              className="rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary">
              {saving ? t("saving") : t("save")}
            </button>}
            {!valid && <p role="alert" className="text-xs text-danger">{t("invalid")}</p>}
            {success && <p role="status" className="text-sm text-text-muted">{t("saved")}</p>}
          </section>
          {usage && <section className="space-y-3 rounded-xl border border-hairline bg-surface p-5">
            <h2 className="font-semibold text-foreground">{t("usageTitle")}</h2>
            <p className="text-xs text-text-muted">{t("period")} {new Date(usage.periodStart).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" })} (UTC)</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <p className="text-sm text-foreground"><strong className="block text-xl">{usage.recordedRequests}</strong>{t("requests")}</p>
              <p className="text-sm text-foreground"><strong className="block text-xl">{usage.inputTokens + usage.outputTokens}</strong>{t("tokens")}</p>
              <p className="text-sm text-foreground"><strong className="block text-xl">${(usage.recordedCostUsdMicros / 1_000_000).toFixed(4)}</strong>{t("cost")}</p>
            </div>
            <p className="text-xs text-text-muted">{t("usageNote")}</p>
          </section>}
        </>
      )}
    </main>
  );
}
