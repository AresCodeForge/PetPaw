import { redirect } from "next/navigation";
import { createSupabaseServerClient, isAdmin } from "@/lib/supabase-server";
import AdminLayoutClient from "./AdminLayoutClient";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?redirect=" + encodeURIComponent("/admin"));
  }

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
