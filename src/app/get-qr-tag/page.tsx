"use client";

import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpWithPassword } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function GetQRTagForm() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const claimCode = searchParams.get("claim")?.toLowerCase().trim() ?? null;
  const [ownerName, setOwnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check for OAuth errors in URL
  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (error) {
      setIsError(true);
      setMessage(errorDescription || (lang === "el" ? "Αποτυχία εγγραφής. Παρακαλώ δοκιμάστε ξανά." : "Sign up failed. Please try again."));
    }
  }, [searchParams, lang]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (password.length < 6) {
      setIsError(true);
      setMessage(t("getQr_passwordMin"));
      return;
    }
    if (password !== confirmPassword) {
      setIsError(true);
      setMessage(t("getQr_passwordMatch"));
      return;
    }

    setLoading(true);

    const metadata: Record<string, unknown> = {
      owner_name: ownerName.trim(),
    };

    const { data, error } = await signUpWithPassword(email.trim(), password, metadata);

    setLoading(false);

    if (error) {
      setIsError(true);
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        setMessage(t("getQr_emailExists"));
      } else {
        setMessage(error.message || t("login_error_generic"));
      }
      return;
    }

    // If email confirmation is required, Supabase may not set session immediately
    if (data?.user && !data.session && data.user.identities?.length === 0) {
      setMessage(t("getQr_emailExists"));
      setIsError(true);
      return;
    }

    if (data?.session) {
      router.push(claimCode ? `/dashboard/add-pet?claim=${encodeURIComponent(claimCode)}` : "/dashboard");
      return;
    }

    // Email confirmation required
    setMessage(t("getQr_checkEmail"));
  };

  // Build redirect URL for Google OAuth (includes claim code if present)
  const googleRedirectTo = claimCode 
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/add-pet?claim=${encodeURIComponent(claimCode)}`
    : `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard`;

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-4xl font-bold text-foreground transition-colors duration-300">{t("getQr_title")}</h1>
      <p className="mt-4 text-foreground-muted">
        {t("getQr_desc")}
      </p>

      {/* Google Sign Up */}
      <div className="mt-8">
        <GoogleSignInButton redirectTo={googleRedirectTo} mode="signup" />
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-foreground-subtle">
          {lang === "el" ? "ή με email" : "or with email"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          id="ownerName"
          type="text"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          label={t("getQr_yourName")}
          placeholder={t("placeholder_name")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          label={t("getQr_email")}
          placeholder={t("placeholder_email")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <Input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          label={t("getQr_password")}
          placeholder={t("placeholder_password")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />
        <Input
          id="confirmPassword"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          label={t("getQr_confirmPassword")}
          placeholder={t("placeholder_password")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        <div className="flex justify-center">
          <AnimatedButton type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? t("getQr_submitting") : t("getQr_submit")}
          </AnimatedButton>
        </div>
      </form>

      {message && (
        <p
          className={`mt-6 text-center text-sm ${
            isError ? "text-amber-700" : "text-navy-soft"
          }`}
        >
          {message}
          {isError && (message.includes("already registered") || message.includes("εγγεγραμμένο") || message.includes("registered")) && (
            <>
              {" "}
              <Link href="/login" className="font-semibold underline">
                {t("nav_login")}
              </Link>
            </>
          )}
        </p>
      )}

      <p className="mt-8 text-center text-sm text-foreground-muted">
        {t("getQr_hasAccount")}{" "}
        <Link href="/login" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          {t("nav_login")}
        </Link>
      </p>
    </div>
  );
}

export default function GetQRTagPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-6 py-16 text-center text-foreground-muted">Loading…</div>}>
      <GetQRTagForm />
    </Suspense>
  );
}
