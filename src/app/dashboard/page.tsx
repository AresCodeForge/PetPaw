"use client";

import { useEffect, useState } from "react";
import { supabase, completeRegistrationFromMetadata, ensureProfileFromMetadata } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PetCard, { type PetCardData } from "@/components/PetCard";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

interface FoundReport {
  id: string;
  pet_id: string;
  reporter_phone: string;
  created_at: string;
}

export default function DashboardPage() {
  const { t, lang } = useLanguage();
  const [pets, setPets] = useState<PetCardData[]>([]);
  const [reports, setReports] = useState<FoundReport[]>([]);
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [completingSignup, setCompletingSignup] = useState(false);
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);
  const router = useRouter();
  const isPro = tier === "pro";

  const handleDeleteReport = async (reportId: string) => {
    setDeletingReportId(reportId);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/report-found/${reportId}`, {
      method: "DELETE",
      headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
    });
    setDeletingReportId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      console.error("[PetPaw] delete report error:", { code: data.code || "E9001" });
      return;
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  useEffect(() => {
    const run = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const metadata = user.user_metadata as Record<string, unknown> | undefined;
      const ownerName = metadata?.owner_name as string | undefined;
      const petName = metadata?.pet_name as string | undefined;

      if (ownerName && typeof ownerName === "string") {
        await ensureProfileFromMetadata(user.id, user.email ?? "", ownerName);
      }

      let tierFromProfile: "free" | "pro" = "free";
      // Force no caching
      const profileRes = await fetch("/api/profile", { 
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" }
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        tierFromProfile = profileData.tier === "pro" ? "pro" : "free";
        setTier(tierFromProfile);
      }

      if (ownerName && petName && typeof ownerName === "string" && typeof petName === "string") {
        setCompletingSignup(true);
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        const { error: completeError } = await completeRegistrationFromMetadata(
          user.id,
          user.email ?? "",
          {
            owner_name: ownerName,
            pet_name: petName,
            pet_type: (metadata?.pet_type as string) || "Pet",
            pet_description: metadata?.pet_description as string | undefined,
            pet_image_url: metadata?.pet_image_url as string | undefined,
            pet_age: metadata?.pet_age as number | undefined,
          },
          baseUrl
        );
        setCompletingSignup(false);
        if (completeError) {
          console.error("[PetPaw] completeRegistrationFromMetadata error:", { code: "E5002" });
        }
      }

      const { data: petsData, error } = await supabase
        .from("pets")
        .select("id, name, type, age, description, image_url, qr_code_id, is_lost")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      const petIds = (petsData ?? []).map((p: { id: string }) => p.id);

      let reports: { id: string; pet_id: string; reporter_phone: string; created_at: string }[] = [];
      if (petIds.length > 0 && tierFromProfile === "pro") {
        const { data: reportsData } = await supabase
          .from("lost_found_reports")
          .select("id, pet_id, reporter_phone, created_at")
          .in("pet_id", petIds)
          .gt("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false });
        reports = (reportsData ?? []) as typeof reports;
      }

      if (error) {
        console.error("[PetPaw] fetch pets error:", { code: "E5001" });
      } else {
        const qrCodeIds = (petsData ?? [])
          .map((p: { qr_code_id?: string | null }) => p.qr_code_id)
          .filter((id): id is string => Boolean(id));
        const qrDataByCodeId: Record<string, string> = {};
        if (qrCodeIds.length > 0) {
          const { data: qrRows } = await supabase
            .from("qr_codes")
            .select("id, qr_code_data")
            .in("id", qrCodeIds);
          for (const row of qrRows ?? []) {
            qrDataByCodeId[row.id] = row.qr_code_data ?? "";
          }
        }
        const firstImageByPet: Record<string, string> = {};
        if (petIds.length > 0) {
          const { data: imgRows } = await supabase
            .from("pet_images")
            .select("pet_id, image_url, sort_order")
            .in("pet_id", petIds)
            .order("sort_order", { ascending: true });
          const seen = new Set<string>();
          for (const row of imgRows ?? []) {
            if (!seen.has(row.pet_id)) {
              firstImageByPet[row.pet_id] = row.image_url;
              seen.add(row.pet_id);
            }
          }
        }
        const list: PetCardData[] = (petsData ?? []).map((p: Record<string, unknown>) => {
          const qrCodeId = p.qr_code_id as string | null | undefined;
          const qrData = qrCodeId ? qrDataByCodeId[qrCodeId] ?? null : null;
          return {
            id: p.id as string,
            name: p.name as string,
            type: p.type as string,
            age: p.age as number | null | undefined,
            description: p.description as string | null | undefined,
            image_url: (firstImageByPet[p.id as string] ?? p.image_url) as string | null | undefined,
            qr_code_id: qrCodeId ?? null,
            qr_code_data: qrData ?? null,
            is_lost: p.is_lost as boolean | undefined,
          };
        });
        setPets(list);
      }

      setReports(reports);
      setLoading(false);
    };

    run();
  }, [router]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading || completingSignup) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <p className="text-foreground-muted">
          {completingSignup ? t("dashboard_setupProfile") : t("dashboard_loadingPets")}
        </p>
      </div>
    );
  }

  const petNames: Record<string, string> = {};
  for (const p of pets) petNames[p.id] = p.name;

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">{t("dashboard_title")}</h1>
      <p className="mt-2 text-foreground-muted">
        {t("dashboard_desc")}
      </p>

      {isPro && reports.length > 0 && (
        <div className="mt-8 rounded-2xl border-2 border-[#f97316] bg-[#fff7ed] p-6">
          <h2 className="text-xl font-bold text-foreground">
            {t("dashboard_foundTitle")}
          </h2>
          <p className="mt-1 text-sm text-foreground-muted">
            {t("dashboard_foundDesc")}
          </p>
          <ul className="mt-4 space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-card p-4 pl-4 pr-12 shadow-sm transition-colors duration-300 relative">
                <span className="font-medium text-foreground">{petNames[r.pet_id] ?? t("dashboard_pet")}</span>
                <span className="text-foreground-muted">—</span>
                <a href={`tel:${r.reporter_phone}`} className="font-semibold text-[#ea580c] hover:underline">
                  {r.reporter_phone}
                </a>
                <span className="text-xs text-foreground-subtle">
                  {new Date(r.created_at).toLocaleDateString(dateLocale, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteReport(r.id)}
                  disabled={deletingReportId === r.id}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-foreground-muted hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                  title={t("dashboard_deleteNotification")}
                  aria-label={t("dashboard_deleteNotification")}
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {pets.length === 0 ? (
        <div className="mt-10 rounded-2xl border-2 border-dashed border-border bg-background-secondary p-10 text-center">
          <p className="text-foreground-muted">
            {t("dashboard_noPets")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <AnimatedButton href="/dashboard/add-pet" variant="primary">
              {t("dashboard_addPet")}
            </AnimatedButton>
            <AnimatedButton href="/get-qr-tag" variant="outline">
              {t("home_getTag")}
            </AnimatedButton>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              publicUrl={pet.qr_code_data ?? `${baseUrl}/pets/${pet.id}`}
              showActions
              isPro={isPro}
            />
          ))}
        </div>
      )}
    </div>
  );
}
