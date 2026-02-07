"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import Loader from "@/components/Loader";
import AnimatedButton from "@/components/AnimatedButton";

export default function AvatarPage() {
  const { t } = useLanguage();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      setAvatarUrl(data.avatar_url ?? null);
    })().finally(() => setLoading(false));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMessage("");
    setUploading(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const res = await fetch("/api/profile/avatar", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    setUploading(false);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setIsError(true);
      setMessage(data.error || t("avatar_fail"));
      return;
    }
    setIsError(false);
    setAvatarUrl(data.avatar_url);
    setMessage(t("avatar_success"));
    if (inputRef.current) inputRef.current.value = "";
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("profile-updated"));
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-8">
        <Loader label={t("common_loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <div className="mb-6">
        <AnimatedButton href="/dashboard/settings" variant="outline" size="sm">
          {t("common_back")}
        </AnimatedButton>
      </div>
      <h1 className="text-2xl font-bold text-foreground">{t("avatar_title")}</h1>
      <p className="mt-2 text-foreground-muted">{t("avatar_upload")}</p>
      <div className="mt-8 flex flex-col items-start gap-6">
        <div className="flex items-center gap-6">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-border bg-background-secondary">
            {avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-foreground-muted">
                🐾
              </div>
            )}
          </div>
          <div>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-foreground-muted file:mr-4 file:rounded-full file:border-0 file:bg-mint file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[#2d2a26]"
            />
            <p className="mt-1 text-xs text-foreground-muted">{t("avatar_upload")}</p>
          </div>
        </div>
      </div>
      {message && (
        <p className={`mt-4 text-sm ${isError ? "text-amber-700" : "text-navy-soft"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
