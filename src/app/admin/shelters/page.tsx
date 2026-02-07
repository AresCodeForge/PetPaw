"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Check, 
  X, 
  Loader2, 
  Building2,
  FileText,
  ExternalLink
} from "lucide-react";

type ShelterApplication = {
  id: string;
  user_id: string;
  organization_name: string;
  registration_number: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  document_urls: string[];
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar_url: string | null;
  };
};

export default function AdminSheltersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [applications, setApplications] = useState<ShelterApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [selectedApp, setSelectedApp] = useState<ShelterApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchApplications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.set("status", filter);
      }

      const response = await fetch(`/api/admin/shelters?${params}`, { credentials: "include" });
      if (response.status === 403) {
        router.push("/");
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setApplications(data.applications);
      }
    } catch (error) {
      console.error("Error fetching applications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, router]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const handleDecision = async (status: "approved" | "rejected") => {
    if (!selectedApp) return;

    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/shelters/${selectedApp.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      });

      if (response.ok) {
        setApplications((prev) =>
          prev.map((a) =>
            a.id === selectedApp.id ? { ...a, status, admin_notes: adminNotes } : a
          )
        );
        setSelectedApp(null);
        setAdminNotes("");
      }
    } catch (error) {
      console.error("Error processing application:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const labels = {
    title: { en: "Shelter Applications", el: "Αιτήσεις Καταφυγίων" },
    all: { en: "All", el: "Όλα" },
    pending: { en: "Pending", el: "Σε Αναμονή" },
    approved: { en: "Approved", el: "Εγκρίθηκαν" },
    rejected: { en: "Rejected", el: "Απορρίφθηκαν" },
    noApplications: { en: "No applications found", el: "Δεν βρέθηκαν αιτήσεις" },
    review: { en: "Review", el: "Εξέταση" },
    approve: { en: "Approve", el: "Έγκριση" },
    reject: { en: "Reject", el: "Απόρριψη" },
    close: { en: "Close", el: "Κλείσιμο" },
    adminNotes: { en: "Admin Notes (optional)", el: "Σημειώσεις Διαχειριστή (προαιρετικό)" },
    notesPlaceholder: { en: "Add notes about this decision...", el: "Προσθέστε σημειώσεις για αυτή την απόφαση..." },
    documents: { en: "Documents", el: "Έγγραφα" },
    viewDocument: { en: "View", el: "Προβολή" },
    appliedBy: { en: "Applied by", el: "Υποβλήθηκε από" },
    appliedOn: { en: "Applied on", el: "Υποβλήθηκε στις" },
  };

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Building2 className="h-6 w-6 text-navy-soft" />
          {labels.title[lang]}
        </h1>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-1 rounded-lg bg-background-secondary p-1">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-300 ${
                filter === f
                  ? "bg-card text-foreground shadow-sm"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {labels[f][lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Applications list */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
        </div>
      ) : applications.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl bg-card p-8 text-center shadow-sm transition-colors duration-300">
          <Building2 className="mb-4 h-12 w-12 text-foreground-subtle" />
          <p className="text-foreground-muted">{labels.noApplications[lang]}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {applications.map((app) => (
            <div
              key={app.id}
              className="rounded-xl bg-card p-5 shadow-sm transition-shadow transition-colors duration-300 hover:shadow-md"
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">{app.organization_name}</h3>
                  <p className="text-sm text-foreground-muted">{app.user.name || app.user.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[app.status]}`}>
                  {labels[app.status][lang]}
                </span>
              </div>

              {/* Info */}
              <div className="mb-4 space-y-2 text-sm text-foreground-muted">
                {app.registration_number && (
                  <p>{lang === "el" ? "Αρ. Μητρώου" : "Reg #"}: {app.registration_number}</p>
                )}
                {app.phone && <p>{app.phone}</p>}
                {app.website && (
                  <a
                    href={app.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-navy-soft hover:underline transition-colors duration-300"
                  >
                    {app.website.replace(/^https?:\/\//, "")}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {/* Documents */}
              {app.document_urls.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium text-foreground-muted">
                    {labels.documents[lang]} ({app.document_urls.length})
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {app.document_urls.map((url, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 rounded bg-background-secondary px-2 py-1 text-xs text-foreground-muted"
                      >
                        <FileText className="h-3 w-3" />
                        {lang === "el" ? `Έγγραφο ${index + 1}` : `Doc ${index + 1}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <p className="mb-4 text-xs text-foreground-subtle">
                {labels.appliedOn[lang]}: {new Date(app.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
              </p>

              {/* Actions */}
              {app.status === "pending" && (
                <button
                  onClick={() => {
                    setSelectedApp(app);
                    setAdminNotes("");
                  }}
                  className="w-full rounded-lg bg-navy-soft py-2 text-sm font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90"
                >
                  {labels.review[lang]}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl bg-card p-6 shadow-xl transition-colors duration-300">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              {labels.review[lang]}: {selectedApp.organization_name}
            </h2>

            {/* Description */}
            {selectedApp.description && (
              <div className="mb-4 rounded-lg bg-background-secondary p-3">
                <p className="text-sm text-foreground-muted">{selectedApp.description}</p>
              </div>
            )}

            {/* Admin notes */}
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-foreground">
                {labels.adminNotes[lang]}
              </label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={labels.notesPlaceholder[lang]}
                rows={3}
                className="w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft transition-colors duration-300"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedApp(null)}
                className="flex-1 rounded-lg border border-border py-2 text-sm font-medium text-foreground-muted transition-colors duration-300 hover:bg-background-secondary"
              >
                {labels.close[lang]}
              </button>
              <button
                onClick={() => handleDecision("rejected")}
                disabled={isProcessing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                <X className="h-4 w-4" />
                {labels.reject[lang]}
              </button>
              <button
                onClick={() => handleDecision("approved")}
                disabled={isProcessing}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                {labels.approve[lang]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
