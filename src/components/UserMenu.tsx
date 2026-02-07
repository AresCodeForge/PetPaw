"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { MessageCircle, QrCode, Package, User, Settings, ShoppingBag, Shield, LogOut } from "lucide-react";

interface UserMenuProps {
  user: { id: string };
  isAdmin: boolean;
  avatarUrl: string | null;
  displayName: string | null;
  unreadMessagesCount?: number;
  newOrdersCount?: number;
}

export default function UserMenu({ 
  user, 
  isAdmin, 
  avatarUrl, 
  displayName,
  unreadMessagesCount = 0,
  newOrdersCount = 0,
}: UserMenuProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const initial = (displayName?.trim()?.[0] || "?").toUpperCase();
  const totalBadgeCount = unreadMessagesCount + newOrdersCount;

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-300 hover:bg-background-secondary lg:justify-start"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t("userMenu_settings")}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-background-secondary text-lg font-semibold text-foreground">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
          {totalBadgeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ea580c] text-[10px] font-bold text-white">
              {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
            </span>
          )}
        </div>
        <span className="hidden truncate font-medium text-foreground lg:block">
          {displayName || t("userMenu_settings")}
        </span>
      </button>

      {open && (
        <div
          className="absolute bottom-full left-0 z-[100] mb-2 w-64 rounded-xl border border-border bg-card py-2 shadow-lg transition-colors duration-300 lg:left-auto lg:right-0"
          role="menu"
        >
          {/* Messages */}
          <Link
            href="/messages"
            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <MessageCircle className="h-4 w-4 text-navy-soft" />
            <span className="flex-1">{t("menu_messages") || "Messages"}</span>
            {unreadMessagesCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-navy-soft px-1.5 text-xs font-bold text-white">
                {unreadMessagesCount > 9 ? "9+" : unreadMessagesCount}
              </span>
            )}
          </Link>

          {/* Order QR */}
          <Link
            href="/order"
            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <QrCode className="h-4 w-4 text-mint" />
            <span>{t("nav_orderQr")}</span>
          </Link>

          <div className="my-1 h-px bg-border" />

          {/* My Pets */}
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <User className="h-4 w-4 text-foreground-subtle" />
            <span>{t("nav_myPets")}</span>
          </Link>

          {/* My Orders */}
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <ShoppingBag className="h-4 w-4 text-foreground-subtle" />
            <span>{t("order_myOrders")}</span>
          </Link>

          {/* Settings */}
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <Settings className="h-4 w-4 text-foreground-subtle" />
            <span>{t("userMenu_settings")}</span>
          </Link>

          {/* Admin Section */}
          {isAdmin && (
            <>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/admin"
                className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-navy-soft hover:bg-background-secondary transition-colors duration-300"
                role="menuitem"
                onClick={() => setOpen(false)}
              >
                <Shield className="h-4 w-4" />
                <span>{t("admin_dashboard")}</span>
              </Link>
              {newOrdersCount > 0 && (
                <Link
                  href="/admin/orders"
                  className="flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-[#ea580c] hover:bg-background-secondary transition-colors duration-300"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <Package className="h-4 w-4" />
                  <span className="flex-1">New Orders</span>
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ea580c] px-1.5 text-xs font-bold text-white">
                    {newOrdersCount > 9 ? "9+" : newOrdersCount}
                  </span>
                </Link>
              )}
            </>
          )}

          <div className="my-1 h-px bg-border" />

          {/* Logout */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-background-secondary transition-colors duration-300"
            role="menuitem"
          >
            <LogOut className="h-4 w-4 text-foreground-subtle" />
            <span>{t("nav_logout")}</span>
          </button>
        </div>
      )}
    </div>
  );
}
