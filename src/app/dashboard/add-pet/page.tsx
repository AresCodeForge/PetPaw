"use client";

import { useState, useEffect, Suspense } from "react";
import { supabase, uploadPetImage, MAX_IMAGES_PER_PET } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PET_TYPES } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { sanitizeName, sanitizeShortText, VALIDATION } from "@/lib/validation";
import { getErrorKey } from "@/lib/errors";
import Loader from "@/components/Loader";
import { customAlphabet } from "nanoid";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const nanoid8 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

function AddPetForm() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimCode = searchParams.get("claim")?.toLowerCase().trim() ?? null;
  const [name, setName] = useState("");
  const [type, setType] = useState<string>(PET_TYPES[0]);
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const isPro = tier === "pro";

  useEffect(() => {
    const check = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        router.push("/login");
        return;
      }
      const profileRes = await fetch("/api/profile", { credentials: "include" });
      if (profileRes.ok) {
        const data = await profileRes.json();
        setTier(data.tier === "pro" ? "pro" : "free");
      }
      setLoading(false);
    };
    check();
  }, [router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const images = files.filter((f) => f.type.startsWith("image/"));
    setImageFiles((prev) => {
      const next = [...prev, ...images].slice(0, MAX_IMAGES_PER_PET);
      return next;
    });
  };

  const removeFile = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setSaving(true);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      router.push("/login");
      setSaving(false);
      return;
    }

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const safeName = sanitizeName(name);
    const safeDesc = sanitizeShortText(description);
    const insertPayload: Record<string, unknown> = {
      owner_id: user.id,
      name: safeName,
      type: type || PET_TYPES[0],
      age: age ? parseInt(age, 10) : null,
      description: safeDesc || null,
    };
    if (isPro) {
      insertPayload.medication_notes = sanitizeShortText(medicationNotes) || null;
    }
    const { data: newPet, error: petError } = await supabase
      .from("pets")
      .insert(insertPayload)
      .select("id")
      .single();

    if (petError || !newPet) {
      console.error("[PetPaw] add pet error:", { code: "E5002" });
      setIsError(true);
      setMessage(t(getErrorKey("E5002")));
      setSaving(false);
      return;
    }

    for (const file of imageFiles) {
      const result = await uploadPetImage(user.id, newPet.id, file);
      if ("error" in result) {
        setMessage(t(getErrorKey("E6001")));
        setIsError(true);
      }
    }

    if (claimCode) {
      const { data: existingQr, error: fetchQrError } = await supabase
        .from("qr_codes")
        .select("id")
        .eq("short_code", claimCode)
        .is("pet_id", null)
        .single();

      if (fetchQrError || !existingQr) {
        setMessage(t("addPet_tagNotFound"));
        setIsError(true);
        setSaving(false);
        router.push("/dashboard");
        return;
      }

      const { error: updateQrError } = await supabase
        .from("qr_codes")
        .update({ pet_id: newPet.id })
        .eq("id", existingQr.id);

      if (updateQrError) {
        setMessage(t("addPet_failLink"));
        setIsError(true);
        setSaving(false);
        router.push("/dashboard");
        return;
      }

      await supabase.from("pets").update({ qr_code_id: existingQr.id }).eq("id", newPet.id);
      setSaving(false);
      router.push("/dashboard");
      return;
    }

    const shortCode = nanoid8();
    const publicUrl = `${baseUrl.replace(/\/$/, "")}/r/${shortCode}`;
    const { data: newQr, error: qrError } = await supabase
      .from("qr_codes")
      .insert({
        pet_id: newPet.id,
        short_code: shortCode,
        qr_code_data: publicUrl,
      })
      .select("id")
      .single();

    if (qrError || !newQr) {
      console.error("[PetPaw] add qr_code error:", { code: "E5002" });
      setIsError(true);
      setMessage(t(getErrorKey("E5002")));
      setSaving(false);
      router.push("/dashboard");
      return;
    }

    await supabase.from("pets").update({ qr_code_id: newQr.id }).eq("id", newPet.id);
    setSaving(false);
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/dashboard" className="text-navy-soft font-semibold hover:underline">
        ← {t("addPet_back")}
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-foreground">
        {claimCode ? t("addPet_titleClaim") : t("addPet_titleAdd")}
      </h1>
      <p className="mt-2 text-foreground-muted">
        {claimCode ? t("addPet_descClaim") : t("addPet_descAdd", { n: MAX_IMAGES_PER_PET })}
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Input
          id="name"
          type="text"
          required
          maxLength={VALIDATION.MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("addPet_petName")}
          placeholder={t("placeholder_petName")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        <Input
          as="select"
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          label={t("addPet_petType")}
        >
          {PET_TYPES.map((typeKey) => (
            <option key={typeKey} value={typeKey}>
              {t("petType_" + typeKey)}
            </option>
          ))}
        </Input>
        <Input
          id="age"
          type="number"
          min={0}
          max={99}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          label={t("addPet_age")}
          placeholder={t("placeholder_petAge")}
        />
        <Input
          as="textarea"
          id="description"
          rows={3}
          maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          label={t("addPet_description")}
          placeholder={t("placeholder_petDesc")}
        />
        {isPro && (
          <Input
            as="textarea"
            id="medication_notes"
            rows={2}
            maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
            value={medicationNotes}
            onChange={(e) => setMedicationNotes(e.target.value)}
            label={t("addPet_medication")}
            placeholder={t("placeholder_medication")}
          />
        )}
        <div>
          <label className="block text-sm font-medium text-foreground">
            {t("addPet_photos", { n: MAX_IMAGES_PER_PET })}
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            onChange={handleFileChange}
            className="mt-2 w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-[#2d2a26] file:mr-4 file:rounded-full file:border-0 file:bg-mint file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#2d2a26] focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
          />
          {imageFiles.length > 0 && (
            <ul className="mt-2 space-y-2">
              {imageFiles.map((file, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-foreground-muted">
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    className="shrink-0 text-amber-600 hover:underline"
                  >
                    {t("addPet_remove")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex justify-center">
          <AnimatedButton type="submit" variant="primary" size="lg" disabled={saving}>
            {saving ? t("addPet_submitting") : claimCode ? t("addPet_submitClaim") : t("addPet_submit")}
          </AnimatedButton>
        </div>
      </form>

      {message && (
        <p className={`mt-4 text-center text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function AddPetPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-6 py-16 text-center text-foreground-muted">Loading…</div>}>
      <AddPetForm />
    </Suspense>
  );
}
