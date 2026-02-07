import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import RCodeClient from "./RCodeClient";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PageProps {
  params: Promise<{ code: string }>;
}

export default async function ShortCodePage({ params }: PageProps) {
  const { code } = await params;
  const normalized = code.toLowerCase().trim();

  const { data: qr, error } = await supabase
    .from("qr_codes")
    .select("id, pet_id, short_code")
    .eq("short_code", normalized)
    .single();

  if (error || !qr) {
    return <RCodeClient status="not_found" />;
  }

  if (qr.pet_id) {
    redirect(`/pets/${qr.pet_id}`);
  }

  return <RCodeClient status="unclaimed" code={normalized} />;
}
