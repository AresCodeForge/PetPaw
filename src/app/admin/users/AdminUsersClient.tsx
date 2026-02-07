"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import { Trash2 } from "lucide-react";
import type { AdminUserRow } from "@/app/api/admin/users/route";

export default function AdminUsersClient() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users", { credentials: "include" });
    setLoading(false);
    if (!res.ok) return;
    const data = await res.json();
    setUsers(data.users ?? []);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleTierChange = async (userId: string, nextPro: boolean) => {
    const tier = nextPro ? "pro" : "free";
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tier }),
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        alert(`Failed to update tier: ${data.error || data.code || 'Unknown error'}`);
        return;
      }
      
      const newTier = data.tier || tier;
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, tier: newTier as "free" | "pro" } : u))
      );
    } catch (err) {
      console.error("[Admin] Tier update error:", err);
      alert("Network error updating tier");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string | null) => {
    const confirmMsg = lang === "el" 
      ? `Είστε σίγουροι ότι θέλετε να διαγράψετε τον χρήστη ${userEmail || userId}; Αυτή η ενέργεια είναι μη αναστρέψιμη!`
      : `Are you sure you want to delete user ${userEmail || userId}? This action cannot be undone!`;
    
    if (!confirm(confirmMsg)) return;

    setDeletingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        alert(lang === "el" 
          ? `Αποτυχία διαγραφής: ${data.error || data.details || 'Άγνωστο σφάλμα'}`
          : `Failed to delete: ${data.error || data.details || 'Unknown error'}`);
        return;
      }
      
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      alert(lang === "el" ? "Ο χρήστης διαγράφηκε επιτυχώς" : "User deleted successfully");
    } catch (err) {
      console.error("[Admin] Delete user error:", err);
      alert(lang === "el" ? "Σφάλμα δικτύου" : "Network error");
    } finally {
      setDeletingId(null);
    }
  };

  const dateLocale = lang === "el" ? "el-GR" : "en-GB";

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("admin_users")}</h1>
      <p className="mt-2 text-foreground-muted">{t("admin_usersDesc")}</p>

      {loading ? (
        <Loader label={t("common_loading")} />
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-card shadow-sm transition-colors duration-300">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border bg-background-secondary">
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_usersEmail")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_usersName")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_usersCreated")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_usersTier")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("admin_usersPro")}</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{lang === "el" ? "Ενέργειες" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 text-sm text-foreground">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {new Date(u.created_at).toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        u.tier === "pro" ? "bg-navy-soft/20 text-navy-soft" : "bg-border text-foreground-muted"
                      }`}
                    >
                      {u.tier === "pro" ? t("plan_pro") : t("plan_free")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={u.tier === "pro"}
                        disabled={updatingId === u.id}
                        onChange={(e) => handleTierChange(u.id, e.target.checked)}
                        className="h-4 w-4 rounded border-border text-navy-soft focus:ring-border focus:ring-navy-soft disabled:opacity-50 transition-colors duration-300"
                      />
                      <span className="text-sm text-foreground-muted">
                        {updatingId === u.id ? t("common_loading") : ""}
                      </span>
                    </label>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(u.id, u.email)}
                      disabled={deletingId === u.id}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-900/20"
                      title={lang === "el" ? "Διαγραφή χρήστη" : "Delete user"}
                    >
                      <Trash2 className="h-4 w-4" />
                      {deletingId === u.id && <span className="text-xs">{t("common_loading")}</span>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6">
        <AnimatedButton href="/dashboard" variant="outline">
          {t("common_back")}
        </AnimatedButton>
      </div>
    </div>
  );
}
