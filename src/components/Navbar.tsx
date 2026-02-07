"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import UserMenu from "@/components/UserMenu";
import CartButton from "@/components/CartButton";
import BurgerMenu from "@/components/BurgerMenu";
import { MessageCircle } from "lucide-react";

export default function Navbar() {
  const { t, lang, setLang } = useLanguage();
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; name: string | null } | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const getInitial = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u ?? null);
      setLoading(false);
    };
    getInitial();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const [adminRes, profileRes] = await Promise.all([
        fetch("/api/admin/me", { credentials: "include" }),
        fetch("/api/profile", { credentials: "include" }),
      ]);
      if (adminRes.ok) {
        const data = await adminRes.json();
        setIsAdmin(!!data.admin);
      } else {
        setIsAdmin(false);
      }
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile({ avatar_url: data.avatar_url ?? null, name: data.name ?? null });
      } else {
        setProfile(null);
      }
    } catch {
      setIsAdmin(false);
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setProfile(null);
      return;
    }
    fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    window.addEventListener("profile-updated", fetchProfile);
    return () => window.removeEventListener("profile-updated", fetchProfile);
  }, [fetchProfile]);

  useEffect(() => {
    if (!isAdmin || !user) {
      setNewOrdersCount(0);
      return;
    }
    const fetchNewCount = async () => {
      try {
        const res = await fetch("/api/admin/orders/new-count", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setNewOrdersCount(typeof data.count === "number" ? data.count : 0);
        }
      } catch {
        setNewOrdersCount(0);
      }
    };
    fetchNewCount();
    const interval = setInterval(fetchNewCount, 60_000);
    return () => clearInterval(interval);
  }, [isAdmin, user]);

  // Fetch unread messages count
  useEffect(() => {
    if (!user) {
      setUnreadMessagesCount(0);
      return;
    }
    const fetchUnreadCount = async () => {
      try {
        const res = await fetch("/api/messages", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const count = (data.conversations || []).reduce((sum: number, c: { unread_count: number }) => sum + c.unread_count, 0);
          setUnreadMessagesCount(count);
        }
      } catch {
        setUnreadMessagesCount(0);
      }
    };
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <>
    <nav className="mx-auto flex max-w-6xl flex-nowrap items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 transition-colors duration-300" aria-label="Main">
      {/* Left: burger menu + language toggle */}
      <div className="flex shrink-0 items-center gap-2">
        {/* Burger menu button */}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground-muted shadow-sm transition-colors duration-300 hover:bg-background-secondary hover:text-foreground"
          aria-label={t("menu_open")}
          aria-expanded={menuOpen}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Language toggle */}
        <div className="flex items-center rounded-full border border-border bg-card p-0.5 shadow-sm">
        <button
          type="button"
          onClick={() => setLang("el")}
          className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors duration-300 md:px-3 ${
            lang === "el" ? "bg-mint text-foreground" : "text-foreground-muted hover:bg-background-secondary"
          }`}
          aria-pressed={lang === "el"}
          aria-label="Ελληνικά"
        >
          ΕΛ
        </button>
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors duration-300 md:px-3 ${
            lang === "en" ? "bg-mint text-foreground" : "text-foreground-muted hover:bg-background-secondary"
          }`}
          aria-pressed={lang === "en"}
          aria-label="English"
        >
          ENG
        </button>
        </div>
      </div>

      {/* Mobile only: right side = cart + messages + new orders badge (admin) + Login or User menu */}
      <div className="flex items-center gap-2 md:hidden">
        <CartButton />
        {!loading && (
          user ? (
            <>
              {/* Messages icon with unread count */}
              <Link
                href="/messages"
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground-muted shadow-sm transition-colors duration-300 hover:bg-background-secondary hover:text-navy-soft"
                aria-label={`Messages${unreadMessagesCount > 0 ? ` (${unreadMessagesCount} unread)` : ""}`}
              >
                <MessageCircle className="h-5 w-5" />
                {unreadMessagesCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-soft px-1 text-xs font-bold text-white">
                    {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                  </span>
                )}
              </Link>
              {isAdmin && newOrdersCount > 0 && (
                <Link
                  href="/admin/orders"
                  className="flex h-9 min-w-[2rem] items-center justify-center rounded-full bg-[#ea580c] px-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#c2410c]"
                  aria-label={`${newOrdersCount} new orders`}
                >
                  {newOrdersCount > 99 ? "99+" : newOrdersCount}
                </Link>
              )}
              <UserMenu
                user={user}
                isAdmin={isAdmin}
                avatarUrl={profile?.avatar_url ?? null}
                displayName={profile?.name ?? null}
              />
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full border-2 border-navy-soft bg-card px-4 py-2 text-sm font-semibold text-navy-soft transition-colors duration-300 hover:bg-navy-soft/10"
            >
              {t("nav_login")}
            </Link>
          )
        )}
      </div>

      {/* Desktop only: full nav links + Cart + Order QR + Login/User menu */}
      <div className="hidden flex-nowrap items-center gap-4 text-sm font-medium md:flex md:gap-6">
        <Link href="/how-it-works" className="whitespace-nowrap text-foreground transition-colors duration-300 hover:text-navy-soft">
          {t("nav_howItWorks")}
        </Link>
        <Link href="/pricing" className="whitespace-nowrap text-foreground transition-colors duration-300 hover:text-navy-soft">
          {t("nav_pricing")}
        </Link>
        <CartButton />
        {!loading && (
          <>
            {user ? (
              <>
                {/* Messages icon with unread count */}
                <Link
                  href="/messages"
                  className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground-muted shadow-sm transition-colors duration-300 hover:bg-background-secondary hover:text-navy-soft"
                  aria-label={`Messages${unreadMessagesCount > 0 ? ` (${unreadMessagesCount} unread)` : ""}`}
                >
                  <MessageCircle className="h-5 w-5" />
                  {unreadMessagesCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-soft px-1 text-xs font-bold text-white">
                      {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/order"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-mint px-5 py-2.5 text-foreground font-semibold transition-colors duration-300 hover:bg-mint-hover"
                >
                  {t("nav_orderQr")}
                </Link>
                {isAdmin && newOrdersCount > 0 && (
                  <Link
                    href="/admin/orders"
                    className="flex h-9 min-w-[2.25rem] items-center justify-center rounded-full bg-[#ea580c] px-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#c2410c]"
                    aria-label={`${newOrdersCount} new orders`}
                  >
                    {newOrdersCount > 99 ? "99+" : newOrdersCount}
                  </Link>
                )}
                <UserMenu
                  user={user}
                  isAdmin={isAdmin}
                  avatarUrl={profile?.avatar_url ?? null}
                  displayName={profile?.name ?? null}
                />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border-2 border-navy-soft bg-card px-5 py-2.5 text-sm font-semibold text-navy-soft transition-colors duration-300 hover:bg-navy-soft/10"
                >
                  {t("nav_login")}
                </Link>
                <Link
                  href="/order"
                  className="inline-flex shrink-0 items-center justify-center rounded-full bg-mint px-5 py-2.5 text-foreground font-semibold transition-colors duration-300 hover:bg-mint-hover"
                >
                  {t("nav_orderQr")}
                </Link>
              </>
            )}
          </>
        )}
      </div>
    </nav>

    {/* Burger Menu Drawer */}
    <BurgerMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
