"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/supabase";
import { sanitizeName, VALIDATION } from "@/lib/validation";
import { getErrorKey } from "@/lib/errors";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

const PRO_PRICE = 1.5; // Annual Pro subscription price

export default function SettingsPage() {
  const { t } = useLanguage();
  const { addItem } = useCart();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [confirmNewEmail, setConfirmNewEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setAvatarUrl(data.avatar_url ?? null);
      setTier(data.tier === "pro" ? "pro" : "free");
    })().finally(() => setLoading(false));
  }, []);

  const handleSubmitName = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setSaving(true);
    setIsError(false);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: sanitizeName(name) || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setIsError(true);
        const errorKey = data.code ? getErrorKey(data.code) : "error_unknown";
        setMessage(t(errorKey));
        return;
      }
      setMessage(t("settings_success"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    if (!newEmail.trim()) {
      setIsError(true);
      setMessage(t("settings_fail"));
      return;
    }
    if (newEmail !== confirmNewEmail) {
      setIsError(true);
      setMessage(t("getQr_passwordMatch"));
      return;
    }
    setChangingEmail(true);
    try {
      const { error: emailError } = await supabase.auth.updateUser({ email: newEmail.trim() });
      if (emailError) {
        setIsError(true);
        setMessage(emailError.message || t("settings_fail"));
        return;
      }
      setNewEmail("");
      setConfirmNewEmail("");
      setMessage(t("settings_emailConfirmSent"));
    } finally {
      setChangingEmail(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    if (!oldPassword) {
      setIsError(true);
      setMessage(t("settings_currentPasswordRequired"));
      return;
    }
    if (newPassword.length < 6) {
      setIsError(true);
      setMessage(t("getQr_passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setIsError(true);
      setMessage(t("getQr_passwordMatch"));
      return;
    }
    setChangingPassword(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u?.email) {
        setIsError(true);
        setMessage(t("settings_passwordFail"));
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: u.email,
        password: oldPassword,
      });
      if (signInError) {
        setIsError(true);
        setMessage(t("settings_currentPasswordInvalid"));
        return;
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setIsError(true);
        setMessage(error.message || t("settings_passwordFail"));
        return;
      }
      setMessage(t("settings_passwordUpdated"));
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  const initial = (name?.trim()?.[0] || "?").toUpperCase();

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <AnimatedButton href="/dashboard" variant="outline" size="sm">
          {t("common_back")}
        </AnimatedButton>
      </div>
      <h1 className="text-2xl font-bold text-foreground">{t("settings_title")}</h1>

      {/* Avatar with Edit link below */}
      <div className="mt-8 flex flex-col items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border-2 border-border bg-background-secondary">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-semibold text-foreground">
              {initial}
            </span>
          )}
        </div>
        <Link
          href="/dashboard/settings/avatar"
          className="mt-2 text-xs text-navy-soft hover:underline"
        >
          {t("settings_editAvatar")}
        </Link>
      </div>

      <form onSubmit={handleSubmitName} className="mt-8 space-y-6">
        <Input
          id="name"
          type="text"
          maxLength={VALIDATION.MAX_NAME_LENGTH}
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t("settings_name")}
          placeholder={t("placeholder_name")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <div>
          <label className="block text-sm font-medium text-foreground">{t("settings_email")}</label>
          <p className="mt-2 text-foreground-muted">{email || "—"}</p>
        </div>
        <AnimatedButton type="submit" variant="primary" disabled={saving}>
          {saving ? t("settings_saving") : t("settings_save")}
        </AnimatedButton>
      </form>

      <div className="mt-8 rounded-2xl border border-border bg-background-secondary p-4">
        <p className="text-sm font-medium text-foreground">
          {t("plan_current")}: <span className="font-semibold">{tier === "pro" ? t("plan_pro") : t("plan_free")}</span>
        </p>
        {tier !== "pro" && (
          <div className="mt-2">
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
        )}
      </div>

      {/* Change Email section */}
      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">{t("settings_changeEmail")}</h2>
        <form onSubmit={handleChangeEmail} className="mt-4 space-y-4">
          <Input
            id="newEmail"
            type="email"
            maxLength={VALIDATION.MAX_EMAIL_LENGTH}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            label={t("settings_newEmail")}
            placeholder={t("placeholder_email")}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <Input
            id="confirmNewEmail"
            type="email"
            maxLength={VALIDATION.MAX_EMAIL_LENGTH}
            value={confirmNewEmail}
            onChange={(e) => setConfirmNewEmail(e.target.value)}
            label={t("settings_confirmNewEmail")}
            placeholder={t("placeholder_email")}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <AnimatedButton
            type="submit"
            variant="primary"
            disabled={changingEmail || !newEmail.trim() || newEmail !== confirmNewEmail}
          >
            {changingEmail ? t("common_loading") : t("settings_changeEmail")}
          </AnimatedButton>
        </form>
      </div>

      <div className="mt-10 border-t border-border pt-8">
        <h2 className="text-lg font-semibold text-foreground">{t("settings_changePassword")}</h2>
        <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
          <Input
            id="oldPassword"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            label={t("settings_currentPassword")}
            placeholder="••••••••"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
          />
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            label={t("settings_newPassword")}
            placeholder="••••••••"
            minLength={6}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            }
          />
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            label={t("settings_confirmPassword")}
            placeholder="••••••••"
            minLength={6}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
          />
          <AnimatedButton
            type="submit"
            variant="primary"
            disabled={
              changingPassword ||
              !oldPassword ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword
            }
          >
            {changingPassword ? t("common_loading") : t("settings_changePassword")}
          </AnimatedButton>
        </form>
      </div>

      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>{message}</p>
      )}
    </div>
  );
}
