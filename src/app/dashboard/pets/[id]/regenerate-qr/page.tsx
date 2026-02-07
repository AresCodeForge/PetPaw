"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { customAlphabet } from "nanoid";
import { useLanguage } from "@/contexts/LanguageContext";
import { getErrorKey } from "@/lib/errors";
import AnimatedButton from "@/components/AnimatedButton";

const nanoid8 = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 8);

export default function RegenerateQRPage() {
  const { t } = useLanguage();
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
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
        .eq("id", id)
        .eq("owner_id", user.id)
        .single();

      if (error || !pet) {
        router.push("/dashboard");
        return;
      }

      setLoading(false);
    };

    run();
  }, [id, router]);

  const handleRegenerate = async () => {
    setMessage("");
    setIsError(false);
    setRegenerating(true);

    const baseUrl = (typeof window !== "undefined" ? window.location.origin : "").replace(/\/$/, "");

    const { data: existingQr } = await supabase
      .from("qr_codes")
      .select("id, short_code")
      .eq("pet_id", id)
      .single();

    let publicUrl: string;

    if (existingQr?.short_code) {
      publicUrl = `${baseUrl}/r/${existingQr.short_code}`;
      const { error: updateError } = await supabase
        .from("qr_codes")
        .update({ qr_code_data: publicUrl })
        .eq("id", existingQr.id);

      if (updateError) {
        console.error("[PetPaw] regenerate QR error:", { code: "E5003" });
        setIsError(true);
        setMessage(t(getErrorKey("E5003")));
        setRegenerating(false);
        return;
      }
    } else {
      const shortCode = nanoid8();
      publicUrl = `${baseUrl}/r/${shortCode}`;
      const { data: newQr, error: insertError } = await supabase
        .from("qr_codes")
        .insert({ pet_id: id, short_code: shortCode, qr_code_data: publicUrl })
        .select("id")
        .single();

      if (insertError || !newQr) {
        console.error("[PetPaw] create QR error:", { code: "E5002" });
        setIsError(true);
        setMessage(t(getErrorKey("E5003")));
        setRegenerating(false);
        return;
      }

      await supabase.from("pets").update({ qr_code_id: newQr.id }).eq("id", id);
    }

    setRegenerating(false);
    setMessage("Το QR ενημερώθηκε. Η δημόσια URL: " + publicUrl);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center text-foreground-muted">
        Φόρτωση…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <Link href="/dashboard" className="text-navy-soft font-semibold hover:underline">
        ← Πίσω στον πίνακα ελέγχου
      </Link>
      <h1 className="mt-6 text-3xl font-bold text-foreground">Αναδημιουργία QR</h1>
      <p className="mt-4 text-foreground-muted">
        Ο κωδικός QR δείχνει στη δημόσια σελίδα του κατοικίδιού σας. Η αναδημιουργία διατηρεί την
        ίδια URL· χρησιμοποιήστε την αν χρειάζεται να συγχρονίσετε ή να ξανατυπώσετε την ετικέτα.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <AnimatedButton variant="primary" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Ενημέρωση…" : "Ενημέρωση δεδομένων QR"}
        </AnimatedButton>
        <AnimatedButton href="/dashboard" variant="outline">
          Ακύρωση
        </AnimatedButton>
      </div>
      {message && (
        <p className={`mt-6 text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
