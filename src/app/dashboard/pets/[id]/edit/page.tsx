"use client";

import { useEffect, useState } from "react";
import { supabase, uploadPetImage, getPetImages, deletePetImage, MAX_IMAGES_PER_PET } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { PET_TYPES } from "@/lib/constants";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { sanitizeName, sanitizeShortText, sanitizeText, VALIDATION } from "@/lib/validation";
import { getErrorKey } from "@/lib/errors";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const PRO_PRICE = 1.5; // Annual Pro subscription price

interface PetImageRow {
  id: string;
  image_url: string;
}

interface VaccinationRow {
  id: string;
  name: string;
  administered_at: string;
  notes: string | null;
}

/** Format a date string (YYYY-MM-DD) to DD-MM-YYYY */
function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return "";
  // Handle YYYY-MM-DD format
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return dateStr;
}

export default function EditPetPage() {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [age, setAge] = useState("");
  const [description, setDescription] = useState("");
  const [medicationNotes, setMedicationNotes] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");
  const [vetContact, setVetContact] = useState("");
  const [dietInfo, setDietInfo] = useState("");
  const [isLost, setIsLost] = useState(false);
  const [images, setImages] = useState<PetImageRow[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationRow[]>([]);
  const [newVacName, setNewVacName] = useState("");
  const [newVacDate, setNewVacDate] = useState("");
  const [newVacNotes, setNewVacNotes] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const isPro = tier === "pro";

  const loadImages = async () => {
    const { data } = await getPetImages(id);
    setImages(data);
  };

  useEffect(() => {
    const run = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push("/login");
        return;
      }

      const [profileRes, { data: pet, error }] = await Promise.all([
        fetch("/api/profile", { 
          credentials: "include",
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" }
        }).then((r) => r.ok ? r.json() : { tier: "free" }),
        supabase
          .from("pets")
          .select("id, name, type, age, description, medication_notes, private_notes, vet_contact, diet_info, is_lost")
          .eq("id", id)
          .eq("owner_id", user.id)
          .single(),
      ]);

      if (error || !pet) {
        console.error("[PetPaw] fetch pet error:", { code: "E5001" });
        router.push("/dashboard");
        return;
      }

      setTier((profileRes?.tier === "pro" ? "pro" : "free") as "free" | "pro");
      setName(pet.name);
      setType(PET_TYPES.includes(pet.type as "Dog" | "Cat") ? pet.type : PET_TYPES[0]);
      setAge(pet.age != null ? String(pet.age) : "");
      setDescription(pet.description ?? "");
      setMedicationNotes(pet.medication_notes ?? "");
      setPrivateNotes(pet.private_notes ?? "");
      setVetContact((pet as { vet_contact?: string }).vet_contact ?? "");
      setDietInfo((pet as { diet_info?: string }).diet_info ?? "");
      setIsLost(!!pet.is_lost);
      await loadImages();
      if ((profileRes?.tier === "pro")) {
        const { data: vacRows } = await supabase
          .from("pet_vaccinations")
          .select("id, name, administered_at, notes")
          .eq("pet_id", id)
          .order("administered_at", { ascending: false });
        setVaccinations((vacRows ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          administered_at: r.administered_at,
          notes: r.notes ?? null,
        })));
      }
      setLoading(false);
    };

    run();
  }, [id, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setSaving(true);

    const payload: Record<string, unknown> = {
      name: sanitizeName(name),
      type: type || PET_TYPES[0],
      age: age ? parseInt(age, 10) : null,
      description: sanitizeShortText(description) || null,
    };
    if (isPro) {
      payload.medication_notes = sanitizeShortText(medicationNotes) || null;
      payload.private_notes = sanitizeText(privateNotes) || null;
      payload.vet_contact = sanitizeShortText(vetContact) || null;
      payload.diet_info = sanitizeShortText(dietInfo) || null;
      payload.is_lost = isLost;
    }
    const { error } = await supabase.from("pets").update(payload).eq("id", id);

    setSaving(false);

    if (error) {
      console.error("[PetPaw] update pet error:", { code: "E5003" });
      setIsError(true);
      setMessage(t(getErrorKey("E5003")));
      return;
    }

    setMessage(t("editPet_success"));
    setTimeout(() => router.push("/dashboard"), 1000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (images.length >= MAX_IMAGES_PER_PET) {
      setMessage(t("editPet_maxPhotos", { n: MAX_IMAGES_PER_PET }));
      setIsError(true);
      return;
    }
    setUploading(true);
    setMessage("");
    const result = await uploadPetImage(user.id, id, file);
    setUploading(false);
    e.target.value = "";
    if ("error" in result) {
      setMessage(t(getErrorKey("E6001")));
      setIsError(true);
      return;
    }
    await loadImages();
  };

  const handleRemoveImage = async (imageId: string) => {
    const { error } = await deletePetImage(imageId);
    if (error) {
      setMessage(t(getErrorKey("E5004")));
      setIsError(true);
      return;
    }
    await loadImages();
  };

  const handleAddVaccination = async () => {
    const name = newVacName.trim();
    const date = newVacDate.trim();
    if (!name || !date) return;
    const { data, error } = await supabase
      .from("pet_vaccinations")
      .insert({ pet_id: id, name, administered_at: date, notes: newVacNotes.trim() || null })
      .select("id, name, administered_at, notes")
      .single();
    if (error) {
      setMessage(t(getErrorKey("E5002")));
      setIsError(true);
      return;
    }
    setVaccinations((prev) => [{ id: data.id, name: data.name, administered_at: data.administered_at, notes: data.notes ?? null }, ...prev]);
    setNewVacName("");
    setNewVacDate("");
    setNewVacNotes("");
  };

  const handleDeleteVaccination = async (vacId: string) => {
    const { error } = await supabase.from("pet_vaccinations").delete().eq("id", vacId);
    if (error) {
      setMessage(t(getErrorKey("E5004")));
      setIsError(true);
      return;
    }
    setVaccinations((prev) => prev.filter((v) => v.id !== vacId));
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
        ← {t("editPet_back")}
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <h1 className="text-3xl font-bold text-foreground">{t("editPet_title")}</h1>
        {isPro && (
          <AnimatedButton href={`/dashboard/pets/${id}/journal`} variant="outline" size="sm">
            {t("petCard_journal")}
          </AnimatedButton>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Input
          id="name"
          type="text"
          required
          maxLength={VALIDATION.MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("addPet_petName")}
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
        />
        <Input
          as="textarea"
          id="description"
          rows={3}
          maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          label={t("editPet_publicDesc")}
        />
        {isPro ? (
          <>
            <Input
              as="textarea"
              id="medication_notes"
              rows={2}
              maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
              value={medicationNotes}
              onChange={(e) => setMedicationNotes(e.target.value)}
              label={t("editPet_medicationPublic")}
              placeholder={t("placeholder_medication")}
            />
            <Input
              as="textarea"
              id="private_notes"
              rows={3}
              maxLength={VALIDATION.MAX_TEXT_LENGTH}
              value={privateNotes}
              onChange={(e) => setPrivateNotes(e.target.value)}
              label={t("editPet_privateNotes")}
              placeholder={t("placeholder_privateNotes")}
            />
            <Input
              as="textarea"
              id="vet_contact"
              rows={2}
              maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
              value={vetContact}
              onChange={(e) => setVetContact(e.target.value)}
              label={t("editPet_vetContact")}
              placeholder="e.g. Dr. Name, 210 1234567"
            />
            <Input
              as="textarea"
              id="diet_info"
              rows={2}
              maxLength={VALIDATION.MAX_SHORT_TEXT_LENGTH}
              value={dietInfo}
              onChange={(e) => setDietInfo(e.target.value)}
              label={t("editPet_dietInfo")}
              placeholder="e.g. kibble 2x/day, no chicken"
            />
            <div className="flex items-center gap-3">
              <input
                id="is_lost"
                type="checkbox"
                checked={isLost}
                onChange={(e) => setIsLost(e.target.checked)}
                className="h-4 w-4 rounded border-border text-mint focus:ring-mint"
              />
              <label htmlFor="is_lost" className="text-sm font-medium text-foreground">
                {t("editPet_isLost")}
              </label>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{t("editPet_vaccinations")}</h3>
              {vaccinations.length === 0 ? (
                <p className="mt-2 text-sm text-foreground-muted">{t("editPet_noVaccinations")}</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {vaccinations.map((v) => (
                    <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-background-secondary px-4 py-2">
                      <span className="font-medium text-foreground">{v.name}</span>
                      <span className="text-sm text-foreground-muted">{formatDateDDMMYYYY(v.administered_at)}</span>
                      {v.notes && <span className="w-full text-sm text-foreground-muted">{v.notes}</span>}
                      <button
                        type="button"
                        onClick={() => handleDeleteVaccination(v.id)}
                        className="text-sm text-amber-600 hover:underline"
                      >
                        {t("editPet_delete")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div className="flex-1 min-w-[120px]">
                  <Input
                    id="new_vac_name"
                    type="text"
                    value={newVacName}
                    onChange={(e) => setNewVacName(e.target.value)}
                    label={t("editPet_vaccinationName")}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Input
                    id="new_vac_date"
                    type="date"
                    value={newVacDate}
                    onChange={(e) => setNewVacDate(e.target.value)}
                    label={t("editPet_vaccinationDate")}
                    size="sm"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <Input
                    id="new_vac_notes"
                    type="text"
                    value={newVacNotes}
                    onChange={(e) => setNewVacNotes(e.target.value)}
                    label={t("editPet_vaccinationNotes")}
                    size="sm"
                  />
                </div>
                <AnimatedButton type="button" onClick={handleAddVaccination} variant="primary" size="sm">
                  {t("editPet_addVaccination")}
                </AnimatedButton>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-border bg-background-secondary p-4">
            <p className="text-sm text-foreground-muted">{t("editPet_proUnlock")}</p>
            <div className="mt-3">
              <AnimatedButton
                variant="secondary"
                size="sm"
                onClick={() => {
                  addItem({
                    type: "pro_subscription",
                    name: t("cart_proSubscription"),
                    price: PRO_PRICE,
                    quantity: 1,
                  });
                }}
              >
                {t("upgrade_to_pro")} — €{PRO_PRICE.toFixed(2)}/{t("cart_year")}
              </AnimatedButton>
            </div>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-foreground">
            {t("editPet_photos", { n: MAX_IMAGES_PER_PET })}
          </label>
          <div className="mt-2 flex flex-wrap gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-xl border border-border bg-background-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.image_url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(img.id)}
                  className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white hover:bg-amber-600"
                >
                  {t("addPet_remove")}
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES_PER_PET && (
              <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border bg-background-secondary text-sm text-foreground-muted hover:border-mint">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={uploading}
                />
                {uploading ? t("editPet_uploading") : t("editPet_addPhoto")}
              </label>
            )}
          </div>
        </div>
        <div className="flex justify-center">
          <AnimatedButton type="submit" variant="primary" size="lg" disabled={saving}>
            {saving ? t("editPet_saving") : t("editPet_saveChanges")}
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
