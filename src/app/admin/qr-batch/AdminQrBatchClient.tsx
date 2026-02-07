"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

type QrStats = {
  total: number;
  unclaimed: number;
  claimed: number;
  unprinted: number;
  unprinted_unclaimed: number;
  recent: { short_code: string; created_at: string; printed_at: string | null; claimed: boolean; pet_name: string | null; owner_email: string | null }[];
};

export default function AdminQrBatchClient() {
  const { t, lang } = useLanguage();
  const [count, setCount] = useState(10);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState("");
  const [shortCodes, setShortCodes] = useState<string[]>([]);
  const [isError, setIsError] = useState(false);
  const [stats, setStats] = useState<QrStats | null>(null);
  const [markingShortCode, setMarkingShortCode] = useState<string | null>(null);

  const refreshStats = async () => {
    try {
      const res = await fetch("/api/admin/qr-stats", { credentials: "include" });
      if (res.ok) setStats(await res.json());
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/qr-stats", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // ignore
      }
    };
    load();
  }, [creating]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setCreating(true);
    try {
      const res = await fetch("/api/admin/qr-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || t("admin_failCreate"));
        setIsError(true);
        return;
      }
      setShortCodes(data.short_codes ?? []);
      setMessage(`${t("admin_createdCount")} ${data.short_codes?.length ?? 0} ${t("admin_labels")}`);
    } finally {
      setCreating(false);
    }
  };

  const handleMarkOnePrinted = async (shortCode: string) => {
    setMarkingShortCode(shortCode);
    setMessage("");
    setIsError(false);
    try {
      const res = await fetch("/api/admin/qr-mark-printed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ short_code: shortCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || t("admin_failMark"));
        setIsError(true);
        return;
      }
      await refreshStats();
    } finally {
      setMarkingShortCode(null);
    }
  };

  const handleDownloadPdf = async (filter: "unprinted" | "all") => {
    setDownloading(true);
    setMessage("");
    try {
      const url = `/api/admin/qr-labels?filter=${filter}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error || t("admin_failPdf"));
        setIsError(true);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "petpaw-qr-labels.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage(t("admin_pdfDownloaded"));
    } finally {
      setDownloading(false);
    }
  };

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  const dash = "—";

  return (
    <div className="mt-10 space-y-8">
      <form onSubmit={handleCreate} className="rounded-2xl border border-border bg-background-secondary p-6 transition-colors duration-300">
        <h2 className="text-xl font-semibold text-foreground">{t("admin_newBatch")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{t("admin_newBatchDesc")}</p>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{t("admin_count")}</span>
            <input
              type="number"
              min={1}
              max={500}
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              className="w-24 rounded-lg border border-border px-3 py-2 text-foreground"
            />
          </label>
          <AnimatedButton type="submit" variant="primary" disabled={creating}>
            {creating ? t("admin_creating") : t("admin_create")}
          </AnimatedButton>
        </div>
      </form>

      {stats && (
        <div className="rounded-2xl border border-border bg-background-secondary p-6 transition-colors duration-300">
          <h2 className="text-xl font-semibold text-foreground">{t("admin_stats")}</h2>
          <p className="mt-1 text-sm text-foreground-muted">{t("admin_statsDesc")}</p>
          <ul className="mt-3 flex flex-wrap gap-4 text-sm">
            <li><span className="font-medium text-foreground">{t("admin_total")}:</span> {stats.total}</li>
            <li><span className="font-medium text-foreground">{t("admin_unclaimed")}:</span> {stats.unclaimed}</li>
            <li><span className="font-medium text-foreground">{t("admin_claimed")}:</span> {stats.claimed}</li>
            <li><span className="font-medium text-foreground">{t("admin_unprinted")}:</span> {stats.unprinted}</li>
            <li><span className="font-medium text-foreground">{t("admin_readyKeyrings")}:</span> {stats.unprinted_unclaimed}</li>
          </ul>
          {stats.recent.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-card">
              <p className="mb-2 px-2 text-sm font-medium text-foreground">{t("admin_recentLabels")}</p>
              <table className="w-full min-w-[1024px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-background-secondary">
                    <th className="min-w-[100px] py-3 pl-4 pr-3 font-medium text-foreground">{t("admin_code")}</th>
                    <th className="min-w-[90px] py-3 px-3 font-medium text-foreground">{t("admin_claimedCol")}</th>
                    <th className="min-w-[120px] py-3 px-3 font-medium text-foreground">{t("admin_pet")}</th>
                    <th className="min-w-[200px] py-3 px-3 font-medium text-foreground">{t("admin_ownerEmail")}</th>
                    <th className="min-w-[100px] py-3 px-3 font-medium text-foreground">{t("admin_printed")}</th>
                    <th className="min-w-[150px] py-3 pl-3 pr-4 font-medium text-foreground">{t("admin_action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.short_code} className="border-b border-[#e8e2d8]/60">
                      <td className="min-w-[100px] py-2.5 pl-4 pr-3 font-mono text-[#5a5652]">{r.short_code}</td>
                      <td className="min-w-[90px] py-2.5 px-3">{r.claimed ? t("admin_yes") : t("admin_no")}</td>
                      <td className="min-w-[120px] py-2.5 px-3">{r.pet_name ?? dash}</td>
                      <td className="min-w-[200px] max-w-[240px] truncate py-2.5 px-3 text-[#5a5652]" title={r.owner_email ?? undefined}>{r.owner_email ?? dash}</td>
                      <td className="min-w-[100px] py-2.5 px-3">{r.printed_at ? new Date(r.printed_at).toLocaleDateString(dateLocale) : t("admin_no")}</td>
                      <td className="min-w-[150px] whitespace-nowrap py-2.5 pl-3 pr-4">
                        {r.printed_at ? (
                          <span className="text-foreground-muted">{dash}</span>
                        ) : (
                          <button
                            type="button"
                            disabled={markingShortCode === r.short_code}
                            onClick={() => handleMarkOnePrinted(r.short_code)}
                            className="rounded-full bg-warm-yellow px-3 py-1.5 text-xs font-medium text-foreground transition-colors duration-300 hover:opacity-90 disabled:opacity-50"
                          >
                            {markingShortCode === r.short_code ? "…" : t("admin_markPrinted")}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card p-6 transition-colors duration-300">
        <h2 className="text-xl font-semibold text-foreground">{t("admin_downloadPdf")}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{t("admin_pdfDesc")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={downloading}
            onClick={() => handleDownloadPdf("unprinted")}
            className="rounded-full bg-sky px-6 py-2.5 font-semibold text-foreground transition-colors duration-300 hover:opacity-90 disabled:opacity-60"
          >
            {downloading ? t("admin_pleaseWait") : t("admin_pdfKeyrings")}
          </button>
          <AnimatedButton variant="outline" disabled={downloading} onClick={() => handleDownloadPdf("all")}>
            {t("admin_pdfLast50")}
          </AnimatedButton>
        </div>
      </div>

      {message && (
        <p className={`text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}

      {shortCodes.length > 0 && (
        <div className="rounded-2xl border border-border bg-background-secondary p-4 transition-colors duration-300">
          <p className="text-sm font-medium text-foreground">{t("admin_recentBatch")} ({shortCodes.length}):</p>
          <p className="mt-2 break-all font-mono text-xs text-foreground-muted">
            {shortCodes.slice(0, 30).join(", ")}
            {shortCodes.length > 30 ? ` … ${shortCodes.length - 30} ${t("admin_andMore")}` : ""}
          </p>
        </div>
      )}
    </div>
  );
}
