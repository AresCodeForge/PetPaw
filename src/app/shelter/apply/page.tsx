"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  Building2, 
  Loader2, 
  Upload, 
  X, 
  CheckCircle, 
  Clock, 
  XCircle,
  FileText,
  BadgeCheck
} from "lucide-react";

type ShelterStatus = {
  is_verified: boolean;
  shelter_name: string | null;
  verified_at: string | null;
  application: {
    id: string;
    organization_name: string;
    status: "pending" | "approved" | "rejected";
    admin_notes: string | null;
    created_at: string;
    reviewed_at: string | null;
  } | null;
};

export default function ShelterApplyPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<ShelterStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    organization_name: "",
    registration_number: "",
    address: "",
    phone: "",
    website: "",
    description: "",
  });
  const [documents, setDocuments] = useState<File[]>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      // Fetch current status
      const response = await fetch("/api/shelter/status", { credentials: "include" });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
      
      setIsLoading(false);
    };
    checkAuth();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (documents.length + files.length > 5) {
      alert(lang === "el" ? "Μέγιστο 5 έγγραφα" : "Maximum 5 documents");
      return;
    }
    setDocuments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organization_name) {
      setError(lang === "el" ? "Το όνομα οργανισμού είναι υποχρεωτικό" : "Organization name is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        data.append(key, value);
      });
      documents.forEach((doc) => {
        data.append("documents", doc);
      });

      const response = await fetch("/api/shelter/apply", {
        method: "POST",
        credentials: "include",
        body: data,
      });

      if (response.ok) {
        // Refresh status
        const statusRes = await fetch("/api/shelter/status", { credentials: "include" });
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || (lang === "el" ? "Αποτυχία υποβολής" : "Submission failed"));
      }
    } catch (err) {
      setError(lang === "el" ? "Αποτυχία υποβολής" : "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const labels = {
    title: { en: "Become a Verified Shelter", el: "Γίνετε Πιστοποιημένο Καταφύγιο" },
    subtitle: { en: "Get a verified badge on your adoption listings", el: "Αποκτήστε σήμα πιστοποίησης στις καταχωρήσεις υιοθεσίας" },
    back: { en: "Back to Adoption Corner", el: "Πίσω στη Γωνιά Υιοθεσίας" },
    
    // Status messages
    alreadyVerified: { en: "You are already a verified shelter!", el: "Είστε ήδη πιστοποιημένο καταφύγιο!" },
    verifiedSince: { en: "Verified since", el: "Πιστοποιήθηκε από" },
    pendingReview: { en: "Your application is pending review", el: "Η αίτησή σας είναι σε αναμονή ελέγχου" },
    submittedOn: { en: "Submitted on", el: "Υποβλήθηκε στις" },
    rejected: { en: "Your application was not approved", el: "Η αίτησή σας δεν εγκρίθηκε" },
    rejectedReason: { en: "Reason", el: "Αιτία" },
    applyAgain: { en: "Apply Again", el: "Υποβολή Ξανά" },
    
    // Form labels
    orgName: { en: "Organization Name", el: "Όνομα Οργανισμού" },
    regNumber: { en: "Registration Number (optional)", el: "Αριθμός Μητρώου (προαιρετικό)" },
    address: { en: "Address (optional)", el: "Διεύθυνση (προαιρετικό)" },
    phone: { en: "Phone (optional)", el: "Τηλέφωνο (προαιρετικό)" },
    website: { en: "Website (optional)", el: "Ιστοσελίδα (προαιρετικό)" },
    description: { en: "About Your Organization", el: "Σχετικά με τον Οργανισμό" },
    descriptionPlaceholder: { en: "Tell us about your shelter or rescue organization...", el: "Πείτε μας για το καταφύγιο ή την οργάνωση διάσωσης..." },
    documents: { en: "Verification Documents", el: "Έγγραφα Πιστοποίησης" },
    documentsHelp: { en: "Upload business license, registration certificate, or other proof (max 5 files, 10MB each)", el: "Ανεβάστε άδεια λειτουργίας, πιστοποιητικό εγγραφής ή άλλη απόδειξη (μέγιστο 5 αρχεία, 10MB το καθένα)" },
    addFiles: { en: "Add files", el: "Προσθήκη αρχείων" },
    submit: { en: "Submit Application", el: "Υποβολή Αίτησης" },
    submitting: { en: "Submitting...", el: "Υποβολή..." },
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-navy-soft" />
      </div>
    );
  }

  // Already verified
  if (status?.is_verified) {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <Link
            href="/adoptions"
            className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            {labels.back[lang]}
          </Link>

          <div className="rounded-xl bg-card p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <BadgeCheck className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">{labels.alreadyVerified[lang]}</h1>
            <p className="mb-4 text-foreground-muted">
              {status.shelter_name}
            </p>
            <p className="text-sm text-foreground-subtle">
              {labels.verifiedSince[lang]}: {new Date(status.verified_at!).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Pending application
  if (status?.application?.status === "pending") {
    return (
      <div className="min-h-full bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
          <Link
            href="/adoptions"
            className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
          >
            <ArrowLeft className="h-4 w-4" />
            {labels.back[lang]}
          </Link>

          <div className="rounded-xl bg-card p-8 text-center shadow-sm transition-colors duration-300">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-foreground">{labels.pendingReview[lang]}</h1>
            <p className="mb-4 text-foreground-muted">
              {status.application.organization_name}
            </p>
            <p className="text-sm text-foreground-subtle">
              {labels.submittedOn[lang]}: {new Date(status.application.created_at).toLocaleDateString(lang === "el" ? "el-GR" : "en-US")}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Rejected - can apply again
  const wasRejected = status?.application?.status === "rejected";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          href="/adoptions"
          className="mb-6 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors duration-300 hover:text-navy-soft"
        >
          <ArrowLeft className="h-4 w-4" />
          {labels.back[lang]}
        </Link>

        {/* Rejected notice */}
        {wasRejected && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 shrink-0 text-red-500" />
              <div>
                <p className="font-medium text-red-800">{labels.rejected[lang]}</p>
                {status?.application?.admin_notes && (
                  <p className="mt-1 text-sm text-red-600">
                    {labels.rejectedReason[lang]}: {status.application.admin_notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
            <Building2 className="h-7 w-7 text-navy-soft" />
            {wasRejected ? labels.applyAgain[lang] : labels.title[lang]}
          </h1>
          <p className="mt-2 text-foreground-muted">{labels.subtitle[lang]}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 rounded-xl bg-card p-6 shadow-sm">
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-600">{error}</div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.orgName[lang]} *
            </label>
            <input
              type="text"
              name="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {labels.regNumber[lang]}
              </label>
              <input
                type="text"
                name="registration_number"
                value={formData.registration_number}
                onChange={handleChange}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                {labels.phone[lang]}
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.address[lang]}
            </label>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.website[lang]}
            </label>
            <input
              type="url"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://"
              className="w-full rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.description[lang]}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder={labels.descriptionPlaceholder[lang]}
              className="w-full resize-none rounded-lg border border-border px-4 py-2.5 text-foreground placeholder:text-foreground-subtle transition-colors duration-300 focus:border-navy-soft focus:outline-none focus:ring-1 focus:ring-navy-soft"
            />
          </div>

          {/* Documents */}
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              {labels.documents[lang]}
            </label>
            <p className="mb-3 text-sm text-foreground-muted">{labels.documentsHelp[lang]}</p>

            {/* Document list */}
            {documents.length > 0 && (
              <div className="mb-3 space-y-2">
                {documents.map((doc, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-foreground-muted" />
                      <span className="text-sm text-foreground truncate max-w-[200px]">{doc.name}</span>
                      <span className="text-xs text-foreground-subtle">
                        ({(doc.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(index)}
                      className="rounded p-1 text-foreground-muted transition-colors duration-300 hover:bg-background-secondary hover:text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {documents.length < 5 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-border px-4 py-3 text-sm text-foreground-muted transition-colors duration-300 hover:border-navy-soft hover:text-navy-soft"
              >
                <Upload className="h-4 w-4" />
                {labels.addFiles[lang]}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy-soft py-3 font-medium text-white transition-colors duration-300 hover:bg-navy-soft/90 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? labels.submitting[lang] : labels.submit[lang]}
          </button>
        </form>
      </div>
    </div>
  );
}
