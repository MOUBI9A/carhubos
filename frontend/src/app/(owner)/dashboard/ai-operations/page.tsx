"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import {
  Activity, AlertTriangle, BrainCircuit, CarFront, Clock3,
  FileClock, FileText, RefreshCw, ShieldCheck, Wrench, ListTodo, Settings2,
} from "lucide-react";
import api from "@/lib/api";

type MetricKey =
  | "vehiclesTotal" | "vehiclesAvailable" | "vehiclesMaintenance"
  | "activeRentals" | "returnsNext24h" | "overdueReturns"
  | "openInvoices" | "documentsExpiring7d" | "documentsExpired" | "urgentTasks";

type SignalCode =
  | "OVERDUE_RETURNS" | "RETURNS_NEXT_24H" | "OPEN_INVOICES"
  | "MAINTENANCE_VEHICLES" | "DOCUMENTS_EXPIRING_7D" | "DOCUMENTS_EXPIRED" | "URGENT_TASKS";

type Briefing = {
  sampledAt: string;
  mode: "MONITOR";
  analysisType: "DETERMINISTIC_AGENCY_RECORDS";
  externalAiUsed: false;
  automatedActionsEnabled: false;
  metrics: Record<MetricKey, number>;
  signals: {
    code: SignalCode;
    count: number;
    severity: "INFO" | "WARNING" | "HIGH";
    source: string;
    definition: string;
    reviewPath: string;
    actionMode: "REVIEW_ONLY";
  }[];
  limitations: string[];
};

const metricCards = [
  { key: "vehiclesTotal", icon: CarFront },
  { key: "vehiclesAvailable", icon: ShieldCheck },
  { key: "vehiclesMaintenance", icon: Wrench },
  { key: "activeRentals", icon: Activity },
  { key: "returnsNext24h", icon: Clock3 },
  { key: "overdueReturns", icon: AlertTriangle },
  { key: "openInvoices", icon: FileText },
  { key: "documentsExpiring7d", icon: FileClock },
  { key: "documentsExpired", icon: AlertTriangle },
  { key: "urgentTasks", icon: ListTodo },
] as const;

const severityColor: Record<Briefing["signals"][number]["severity"], string> = {
  HIGH: "text-danger",
  WARNING: "text-warning",
  INFO: "text-primary",
};

export default function AiOperationsPage() {
  const t = useTranslations("aiOperations");
  const locale = useLocale();
  const [refreshKey, setRefreshKey] = useState(0);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setBriefing(null);
      setError(false);
      try {
        const response = await api.get<Briefing>("/ai-operations/briefing");
        if (active) setBriefing(response.data);
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [refreshKey]);

  const formatCount = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value)
      ? new Intl.NumberFormat(locale).format(value)
      : "—";

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-20">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <BrainCircuit className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest">{t("phase")}</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("title")}</h1>
          <p className="max-w-3xl text-sm text-text-muted">{t("description")}</p>
        </div>
        <Link href="/dashboard/ai-operations/settings"
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary">
          <Settings2 className="h-4 w-4" aria-hidden="true" />
          {t("settingsLink")}
        </Link>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-3 text-sm text-foreground disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {t("refresh")}
        </button>
      </header>

      <section aria-label={t("safetyTitle")} className="rounded-xl border border-hairline bg-surface p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="h-5 w-5 text-success" aria-hidden="true" />
          {t("safetyTitle")}
        </div>
        <p className="text-sm leading-relaxed text-text-muted">{t("safetyDescription")}</p>
      </section>

      {loading ? <p role="status" className="py-12 text-sm text-text-muted">{t("loading")}</p> : null}
      {error ? (
        <div role="alert" className="rounded-xl border border-hairline p-5 text-sm text-text-muted">
          {t("error")}
        </div>
      ) : null}

      {briefing && !loading ? (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span>{t("sampledAt")}: {new Date(briefing.sampledAt).toLocaleString(locale)}</span>
            <span>·</span>
            <span>{t("dataSource")}</span>
            <span>·</span>
            <span>{t("monitor")}</span>
          </div>

          <section aria-labelledby="ai-operations-metrics" className="space-y-4">
            <h2 id="ai-operations-metrics" className="text-lg font-semibold text-foreground">{t("metricsTitle")}</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
              {metricCards.map(({ key, icon: Icon }) => (
                <div key={key} className="rounded-2xl border border-hairline bg-surface p-5">
                  <Icon className="mb-4 h-5 w-5 text-primary" aria-hidden="true" />
                  <p className="text-2xl font-semibold tabular-nums text-foreground">
                    {formatCount(briefing.metrics[key])}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{t(`metrics.${key}`)}</p>
                </div>
              ))}
            </div>
          </section>

          <section aria-labelledby="ai-operations-signals" className="space-y-4">
            <h2 id="ai-operations-signals" className="text-lg font-semibold text-foreground">{t("signalsTitle")}</h2>
            <p className="text-sm text-text-muted">{t("signalsDescription")}</p>
            {briefing.signals.length === 0 ? (
              <p className="rounded-xl border border-hairline bg-surface p-6 text-sm text-text-muted">{t("noSignals")}</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {briefing.signals.map((signal) => (
                  <div key={signal.code} className="space-y-3 rounded-2xl border border-hairline bg-surface p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">{t(`signals.${signal.code}`)}</h3>
                      <span className={`text-sm font-semibold tabular-nums ${severityColor[signal.severity]}`}>
                        {formatCount(signal.count)}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-text-muted">{t(`details.${signal.code}`)}</p>
                    <p className="text-xs text-text-faint">{t("source")}: {signal.source}</p>
                    <Link href={signal.reviewPath}
                      className="inline-flex rounded-md text-sm font-semibold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">
                      {t("review")}
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="border-t border-hairline pt-6 text-xs leading-relaxed text-text-muted">
            <h2 className="mb-2 text-sm font-semibold text-foreground">{t("limitationsTitle")}</h2>
            <p>{t("limitations")}</p>
          </section>
        </>
      ) : null}
    </div>
  );
}
