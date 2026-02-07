"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";
import Input from "@/components/Input";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/login`,
    });

    setLoading(false);

    if (error) {
      setIsError(true);
      setMessage(error.message || t("login_error_generic"));
      return;
    }

    setSent(true);
    setMessage(t("forgot_sent"));
  };

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground">{t("forgot_title")}</h1>
      <p className="mt-2 text-foreground-muted">
        {t("forgot_desc")}
      </p>

      {!sent ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <Input
            id="email"
            type="email"
            required
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            label={t("forgot_email")}
            placeholder={t("placeholder_email")}
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
          />
          <div className="flex justify-center">
            <AnimatedButton type="submit" variant="primary" size="lg" disabled={loading}>
              {loading ? t("common_sending") : t("forgot_submit")}
            </AnimatedButton>
          </div>
        </form>
      ) : null}

      {message && (
        <p
          className={`mt-4 text-center text-sm ${
            isError ? "text-amber-700" : "text-navy-soft"
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-8 text-center text-sm text-foreground-muted">
        <Link href="/login" className="text-navy-soft hover:underline transition-colors duration-300">
          {t("forgot_back")}
        </Link>
      </p>
    </div>
  );
}
