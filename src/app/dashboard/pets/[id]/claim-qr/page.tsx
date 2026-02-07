"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

export default function ClaimQRPage() {
  const { t } = useLanguage();
  const params = useParams();
  const petId = params?.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [petName, setPetName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const { data: pet, error } = await supabase
        .from("pets")
        .select("id, name, qr_code_id")
        .eq("id", petId)
        .eq("owner_id", user.id)
        .single();

      if (error || !pet) {
        router.push("/dashboard");
        return;
      }

      setPetName(pet.name);
      setLoading(false);
    };

    run();
  }, [petId, router]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = shortCode.trim().toLowerCase();
    if (!code) {
      setMessage(t("claimQr_enterCode"));
      setIsError(true);
      return;
    }

    setMessage("");
    setIsError(false);
    setClaiming(true);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.push("/login");
      setClaiming(false);
      return;
    }

    const { data: qrRow, error: fetchError } = await supabase
      .from("qr_codes")
      .select("id")
      .eq("short_code", code)
      .is("pet_id", null)
      .single();

    if (fetchError || !qrRow) {
      setMessage(t("claimQr_tagNotFound"));
      setIsError(true);
      setClaiming(false);
      return;
    }

    const baseUrl = (typeof window !== "undefined" ? window.location.origin : "").replace(/\/$/, "");
    const publicUrl = `${baseUrl}/r/${code}`;

    const { error: updateQrError } = await supabase
      .from("qr_codes")
      .update({ pet_id: petId, qr_code_data: publicUrl })
      .eq("id", qrRow.id);

    if (updateQrError) {
      setMessage(updateQrError.message || t("claimQr_failLink"));
      setIsError(true);
      setClaiming(false);
      return;
    }

    const { data: currentPet } = await supabase
      .from("pets")
      .select("qr_code_id")
      .eq("id", petId)
      .eq("owner_id", user.id)
      .single();

    if (currentPet?.qr_code_id && currentPet.qr_code_id !== qrRow.id) {
      await supabase
        .from("qr_codes")
        .update({ pet_id: null })
        .eq("id", currentPet.qr_code_id);
    }

    const { error: updatePetError } = await supabase
      .from("pets")
      .update({ qr_code_id: qrRow.id })
      .eq("id", petId)
      .eq("owner_id", user.id);

    if (updatePetError) {
      setMessage(t("claimQr_failUpdate"));
      setIsError(true);
      setClaiming(false);
      return;
    }

    setMessage(t("claimQr_success"));
    setIsError(false);
    setShortCode("");
    setClaiming(false);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-lg px-6 py-16 text-center">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("claimQr_title")}</h1>
      <p className="mt-2 text-foreground-muted">
        {t("claimQr_desc", { name: petName })}
      </p>

      <form onSubmit={handleClaim} className="mt-8 space-y-4">
        <Input
          type="text"
          value={shortCode}
          onChange={(e) => setShortCode(e.target.value)}
          label={t("claimQr_label")}
          placeholder={t("claimQr_placeholder")}
          autoComplete="off"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          }
        />
        <div className="flex flex-wrap gap-3">
          <AnimatedButton type="submit" variant="primary" disabled={claiming}>
            {claiming ? t("claimQr_submitting") : t("claimQr_submit")}
          </AnimatedButton>
          <AnimatedButton href="/dashboard" variant="outline">
            {t("common_cancel")}
          </AnimatedButton>
        </div>
      </form>

      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}

      <p className="mt-6 text-sm text-foreground-subtle">
        {t("claimQr_hint")}
      </p>
    </div>
  );
}
