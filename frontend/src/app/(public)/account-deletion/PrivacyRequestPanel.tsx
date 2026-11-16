"use client";

import { useEffect, useState } from "react";
import { ClipboardList, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import api from "@/lib/api";

type RequestType = "ACCESS" | "RECTIFICATION" | "ERASURE" | "OPPOSITION";
type RequestRow = {
  id: string;
  type: RequestType;
  status: "PENDING" | "IN_REVIEW" | "CLOSED";
  createdAt: string;
  closedAt: string | null;
};

export default function PrivacyRequestPanel() {
  const t = useTranslations("auth.privacyRequests");
  const [type, setType] = useState<RequestType>("ACCESS");
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const categories: { value: RequestType; label: string }[] = [
    { value: "ACCESS", label: t("types.access") },
    { value: "RECTIFICATION", label: t("types.rectification") },
    { value: "ERASURE", label: t("types.erasure") },
    { value: "OPPOSITION", label: t("types.opposition") },
  ];

  useEffect(() => {
    let active = true;
    api.get<RequestRow[]>("/auth/privacy-requests")
      .then(({ data }) => { if (active) setItems(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setMessage(t("loadError")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  async function submit() {
    setSending(true);
    setMessage("");
    try {
      const { data } = await api.post<RequestRow>("/auth/privacy-requests", { type });
      setItems((old) => [data, ...old.filter((entry) => entry.id !== data.id)]);
      setMessage(t("submitSuccess"));
    } catch {
      setMessage(t("submitError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section aria-labelledby="privacy-request-title" className="space-y-4 rounded-2xl border border-hairline bg-surface p-6">
      <h2 id="privacy-request-title" className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <ClipboardList className="h-5 w-5 text-primary" aria-hidden="true" />
        {t("title")}
      </h2>
      <p className="text-sm text-text-muted">
        {t("description")}
      </p>
      <label htmlFor="privacy-request-type" className="block text-sm font-medium text-foreground">
        {t("typeLabel")}
      </label>
      <select
        id="privacy-request-type"
        value={type}
        onChange={(event) => setType(event.target.value as RequestType)}
        className="w-full rounded-lg border border-hairline bg-surface-raised p-3 text-foreground focus-visible:outline-2 focus-visible:outline-primary"
      >
        {categories.map((category) => (
          <option key={category.value} value={category.value}>{category.label}</option>
        ))}
      </select>
      <button type="button" onClick={submit} disabled={sending || loading}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
        {sending && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {t("submit")}
      </button>
      {message && <p role="status" className="text-sm text-text-muted">{message}</p>}
      {items.length > 0 && (
        <div className="border-t border-hairline pt-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t("recent")}</h3>
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 text-sm text-text-muted">
                <span>{categories.find((category) => category.value === item.type)?.label ?? t("unknownType")}</span>
                <span>{item.status === "CLOSED" ? t("statuses.closed") : item.status === "IN_REVIEW" ? t("statuses.inReview") : t("statuses.pending")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
