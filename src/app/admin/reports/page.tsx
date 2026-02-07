"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  Flag,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  Clock,
  User,
  Ban,
  MessageCircle,
  Filter,
} from "lucide-react";
import { format } from "date-fns";
import { el, enUS } from "date-fns/locale";
import Image from "next/image";

type ReportEntry = {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: string;
  content_id: string | null;
  reason: string;
  description: string | null;
  status: string;
  resolution_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  reporter: { id: string; name: string | null; avatar_url: string | null } | null;
  reported_user: { id: string; name: string | null; avatar_url: string | null } | null;
  resolved_by_user: { name: string | null } | null;
  content_preview: string | null;
};

export default function AdminReportsPage() {
  const { lang } = useLanguage();
  const [reports, setReports] = useState<ReportEntry[]>([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ReportEntry | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const dateLocale = lang === "el" ? el : enUS;

  const labels = {
    en: {
      title: "Reports & Moderation",
      description: "Review user reports and flagged content",
      reports: "User Reports",
      noReports: "No reports found",
      refresh: "Refresh",
      pending: "Pending",
      reviewed: "Reviewed",
      resolved: "Resolved",
      dismissed: "Dismissed",
      all: "All",
      reporter: "Reported by",
      reportedUser: "Reported user",
      reason: "Reason",
      description_label: "Description",
      contentPreview: "Content Preview",
      contentType: "Type",
      resolve: "Resolve",
      dismiss: "Dismiss",
      markReviewed: "Mark Reviewed",
      resolvedBy: "Resolved by",
      resolutionNotes: "Resolution notes",
      notesPlaceholder: "Add notes about the resolution...",
      close: "Close",
      chat_message: "Chat Message",
      dm_message: "Direct Message",
      profile: "Profile",
      image: "Image",
      harassment: "Harassment or bullying",
      spam: "Spam or scam",
      illegal: "Illegal content",
      inappropriate: "Inappropriate or offensive",
      impersonation: "Impersonation",
      other: "Other",
    },
    el: {
      title: "Αναφορές & Εποπτεία",
      description: "Εξέταση αναφορών χρηστών και επισημασμένου περιεχομένου",
      reports: "Αναφορές Χρηστών",
      noReports: "Δεν βρέθηκαν αναφορές",
      refresh: "Ανανέωση",
      pending: "Εκκρεμείς",
      reviewed: "Εξετασμένες",
      resolved: "Επιλυμένες",
      dismissed: "Απορριφθείσες",
      all: "Όλες",
      reporter: "Αναφέρθηκε από",
      reportedUser: "Αναφερόμενος χρήστης",
      reason: "Αιτία",
      description_label: "Περιγραφή",
      contentPreview: "Προεπισκόπηση Περιεχομένου",
      contentType: "Τύπος",
      resolve: "Επίλυση",
      dismiss: "Απόρριψη",
      markReviewed: "Σήμανση ως Εξετασμένο",
      resolvedBy: "Επιλύθηκε από",
      resolutionNotes: "Σημειώσεις επίλυσης",
      notesPlaceholder: "Προσθέστε σημειώσεις σχετικά με την επίλυση...",
      close: "Κλείσιμο",
      chat_message: "Μήνυμα Chat",
      dm_message: "Προσωπικό Μήνυμα",
      profile: "Προφίλ",
      image: "Εικόνα",
      harassment: "Παρενόχληση ή εκφοβισμός",
      spam: "Spam ή απάτη",
      illegal: "Παράνομο περιεχόμενο",
      inappropriate: "Ακατάλληλο ή προσβλητικό",
      impersonation: "Πλαστοπροσωπία",
      other: "Άλλο",
    },
  }[lang];

  const getReasonLabel = (reason: string): string => {
    return labels[reason as keyof typeof labels] || reason;
  };

  const getContentTypeLabel = (type: string): string => {
    return labels[type as keyof typeof labels] || type;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "reviewed": return "bg-blue-100 text-blue-700";
      case "resolved": return "bg-green-100 text-green-700";
      case "dismissed": return "bg-gray-100 text-gray-600";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  // Fetch reports
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?status=${statusFilter}`);
      const data = await res.json();
      if (res.ok) {
        setReports(data.reports);
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    }
    setIsLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Update report status
  const handleUpdateStatus = async (reportId: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolution_notes: resolutionNotes || undefined }),
      });
      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        setSelectedReport(null);
        setResolutionNotes("");
      }
    } catch (err) {
      console.error("Error updating report:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{labels.title}</h1>
          <p className="text-foreground-subtle">{labels.description}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(["pending", "reviewed", "resolved", "dismissed", "all"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 text-sm font-medium transition-colors duration-300 ${
                  statusFilter === status
                    ? "bg-navy-soft text-white"
                    : "bg-card text-foreground-muted hover:bg-background-secondary"
                }`}
              >
                {labels[status as keyof typeof labels]}
              </button>
            ))}
          </div>
          <button
            onClick={fetchReports}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
          >
            <RefreshCw className="h-4 w-4" />
            {labels.refresh}
          </button>
        </div>

        {/* Reports list */}
        <div className="rounded-xl border border-border bg-card transition-colors duration-300">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-navy-soft" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-12 text-center text-foreground-subtle">
              <Flag className="mx-auto h-12 w-12 text-foreground-muted mb-3" />
              {labels.noReports}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start gap-4 p-4 transition-colors duration-300 hover:bg-background-secondary/50 cursor-pointer"
                  onClick={() => setSelectedReport(report)}
                >
                  {/* Reporter avatar */}
                  <div className="flex-shrink-0">
                    {report.reported_user?.avatar_url ? (
                      <Image
                        src={report.reported_user.avatar_url}
                        alt={report.reported_user.name || "User"}
                        width={40}
                        height={40}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-500">
                        <User className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-foreground">
                        {report.reported_user?.name || "Unknown"}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(report.status)}`}>
                        {labels[report.status as keyof typeof labels]}
                      </span>
                      <span className="rounded-full bg-background-secondary px-2 py-0.5 text-xs text-foreground-muted">
                        {getContentTypeLabel(report.content_type)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground-muted mb-1">
                      {labels.reason}: {getReasonLabel(report.reason)}
                    </p>
                    {report.content_preview && (
                      <p className="text-xs text-foreground-subtle line-clamp-1">
                        &quot;{report.content_preview}&quot;
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-xs text-foreground-subtle">
                      <span>
                        {labels.reporter}: {report.reporter?.name || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(report.created_at), "PPp", { locale: dateLocale })}
                      </span>
                    </div>
                  </div>

                  {/* Quick actions */}
                  {report.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "resolved"); }}
                        className="rounded-lg p-2 text-green-500 hover:bg-green-50 transition-colors duration-300"
                        title={labels.resolve}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleUpdateStatus(report.id, "dismissed"); }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 transition-colors duration-300"
                        title={labels.dismiss}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail modal */}
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl transition-colors duration-300 mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-orange-500" />
                  <h3 className="text-lg font-semibold text-foreground">Report Details</h3>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(selectedReport.status)}`}>
                  {labels[selectedReport.status as keyof typeof labels]}
                </span>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{labels.reportedUser}:</span>{" "}
                  <span className="text-foreground-muted">{selectedReport.reported_user?.name || "Unknown"}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">{labels.reporter}:</span>{" "}
                  <span className="text-foreground-muted">{selectedReport.reporter?.name || "Unknown"}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">{labels.contentType}:</span>{" "}
                  <span className="text-foreground-muted">{getContentTypeLabel(selectedReport.content_type)}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">{labels.reason}:</span>{" "}
                  <span className="text-foreground-muted">{getReasonLabel(selectedReport.reason)}</span>
                </div>
                {selectedReport.description && (
                  <div>
                    <span className="font-medium text-foreground">{labels.description_label}:</span>
                    <p className="mt-1 text-foreground-muted bg-background-secondary rounded-lg p-3">
                      {selectedReport.description}
                    </p>
                  </div>
                )}
                {selectedReport.content_preview && (
                  <div>
                    <span className="font-medium text-foreground">{labels.contentPreview}:</span>
                    <p className="mt-1 text-foreground-muted bg-background-secondary rounded-lg p-3 italic">
                      &quot;{selectedReport.content_preview}&quot;
                    </p>
                  </div>
                )}
                {selectedReport.resolved_by_user && (
                  <div>
                    <span className="font-medium text-foreground">{labels.resolvedBy}:</span>{" "}
                    <span className="text-foreground-muted">{selectedReport.resolved_by_user.name}</span>
                  </div>
                )}
              </div>

              {/* Resolution notes and actions */}
              {selectedReport.status === "pending" && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {labels.resolutionNotes}
                    </label>
                    <textarea
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder={labels.notesPlaceholder}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background-secondary px-3 py-2 text-sm text-foreground focus:border-navy-soft focus:outline-none transition-colors duration-300"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "reviewed")}
                      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
                    >
                      <Eye className="h-4 w-4" />
                      {labels.markReviewed}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "dismissed")}
                      className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors duration-300 hover:bg-gray-50"
                    >
                      <XCircle className="h-4 w-4" />
                      {labels.dismiss}
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(selectedReport.id, "resolved")}
                      className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-2 text-sm font-medium text-white hover:bg-green-600"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {labels.resolve}
                    </button>
                  </div>
                </div>
              )}

              {selectedReport.status !== "pending" && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="rounded-lg border border-border px-4 py-2 text-sm transition-colors duration-300 hover:bg-background-secondary"
                  >
                    {labels.close}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
