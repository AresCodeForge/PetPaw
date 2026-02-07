"use client";

import Link from "next/link";
import { useState, Suspense, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function LoginForm() {
  const { t, lang } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  // Check for OAuth errors in URL (e.g., from failed Google login)
  useEffect(() => {
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    if (error) {
      setIsError(true);
      setMessage(errorDescription || (lang === "el" ? "Αποτυχία σύνδεσης. Παρακαλώ δοκιμάστε ξανά." : "Login failed. Please try again."));
    }
  }, [searchParams, lang]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      console.error("[PetPaw] login error:", { code: "E1001" });
      setIsError(true);
      if (error.message.includes("Invalid login credentials")) {
        setMessage(t("login_error_credentials"));
      } else {
        setMessage(error.message || t("login_error_generic"));
      }
      return;
    }

    router.push(redirectTo);
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("login_title")}</h1>
      <p className="mt-2 text-foreground-muted">
        {t("login_desc")}
      </p>

      {/* Google Sign In */}
      <div className="mt-8">
        <GoogleSignInButton redirectTo={redirectTo} mode="signin" />
      </div>

      {/* Divider */}
      <div className="my-6 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-sm text-[#7a7570]">
          {lang === "el" ? "ή με email" : "or with email"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleLogin} className="space-y-6">
        <Input
          id="email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          label={t("login_email")}
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          label={t("login_password")}
          placeholder={t("placeholder_password")}
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          }
        />

        <div className="flex justify-center">
          <AnimatedButton type="submit" variant="primary" size="lg" disabled={loading}>
            {loading ? t("login_submitting") : t("login_submit")}
          </AnimatedButton>
        </div>
      </form>

      {message && (
        <p
          className={`mt-4 text-center text-sm ${
            isError ? "text-amber-700" : "text-navy-soft"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-6 text-center text-sm text-foreground-muted">
        <Link href="/forgot-password" className="text-navy-soft hover:underline transition-colors duration-300">
          {t("login_forgot")}
        </Link>
      </p>

      <p className="mt-4 text-center text-sm text-foreground-muted">
        <Link href="/get-qr-tag" className="text-navy-soft font-semibold hover:underline transition-colors duration-300">
          {t("login_noAccount")}
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-6 py-16 text-center text-foreground-muted">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
