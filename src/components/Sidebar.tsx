"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { 
  ShoppingCart, HelpCircle, CreditCard, MessageSquare, Heart, BookOpen, Newspaper,
  LogIn, User, ShoppingBag, QrCode, Settings, Shield, Package, LogOut,
  Sun, Moon, Home, Info, ChevronLeft, Building2, Mail, FileText, Scale, Truck, Accessibility,
  X, type LucideIcon
} from "lucide-react";

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================
// 
// The sidebar is organized into logical zones. Each zone contains nav items.
// 
// TO ADD A NEW SECTION:
// 1. Add items to the appropriate zone in getNavConfig()
// 2. Each item needs: id, href, labelKey (for i18n), icon
// 3. Optional: badge (number), requiresAuth, requiresAdmin
//
// TO CONTROL VISIBILITY:
// - requiresAuth: true = only shown when user is logged in
// - requiresAdmin: true = only shown when user has admin role
// - Both can be combined
//
// TO UPDATE ABOUT/LEGAL LINKS:
// - Edit the ABOUT_PANEL_CONFIG object below
// ============================================================================

interface NavItem {
  id: string;
  href: string;
  labelKey: string;
  labelFallback: string;
  icon: LucideIcon;
  badge?: number;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
}

interface NavZone {
  id: string;
  items: NavItem[];
}

// Secondary panel configuration for "About Pet-Paw"
// Edit these to update company and legal links
const ABOUT_PANEL_CONFIG = {
  company: [
    { id: "about", href: "/about", label: "About Us", icon: Building2 },
    { id: "contact", href: "/contact", label: "Contact Us", icon: Mail },
  ],
  legal: [
    { id: "terms", href: "/terms", label: "Terms & Conditions", icon: Scale },
    { id: "privacy", href: "/privacy", label: "Privacy Policy", icon: FileText },
    { id: "shipping", href: "/shipping", label: "Shipping & Returns", icon: Truck },
    { id: "accessibility", href: "/accessibility", label: "Accessibility", icon: Accessibility },
  ],
};

// Build navigation zones based on user state
function getNavConfig(
  user: { id: string } | null,
  isAdmin: boolean,
  unreadMessagesCount: number,
  newOrdersCount: number,
  unreadDMCount: number
): NavZone[] {
  return [
    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 1: CORE FEATURES
    // Home, personal dashboard
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "core",
      items: [
        { id: "home", href: "/", labelKey: "", labelFallback: "Home", icon: Home },
        { id: "pets", href: "/dashboard", labelKey: "nav_myPets", labelFallback: "My Pets", icon: User, requiresAuth: true },
      ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 2: COMMUNITY
    // Public features accessible to everyone
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "community",
      items: [
        { id: "adoptions", href: "/adoptions", labelKey: "", labelFallback: "Adoption Corner", icon: Heart },
        { id: "encyclopedia", href: "/encyclopedia", labelKey: "menu_encyclopedia", labelFallback: "Encyclopedia", icon: BookOpen },
        { id: "chat", href: "/chat", labelKey: "menu_chat", labelFallback: "Community", icon: MessageSquare, badge: unreadDMCount, requiresAuth: false },
        { id: "blog", href: "/blog", labelKey: "menu_blog", labelFallback: "Blog", icon: Newspaper },
      ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 3: COMMERCE
    // QR tags, pricing, orders
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "commerce",
      items: [
        { id: "order-qr", href: "/order", labelKey: "nav_orderQr", labelFallback: "Get QR Tag", icon: QrCode, requiresAuth: true },
        { id: "pricing", href: "/pricing", labelKey: "nav_pricing", labelFallback: "Prices", icon: CreditCard },
        { id: "how-it-works", href: "/how-it-works", labelKey: "nav_howItWorks", labelFallback: "How It Works", icon: HelpCircle },
        { id: "my-orders", href: "/dashboard/orders", labelKey: "order_myOrders", labelFallback: "My Orders", icon: ShoppingBag, requiresAuth: true },
      ],
    },
    // ─────────────────────────────────────────────────────────────────────────
    // ZONE 4: ADMIN
    // Only visible to admin users
    // ─────────────────────────────────────────────────────────────────────────
    {
      id: "admin",
      items: [
        { id: "admin-dashboard", href: "/admin", labelKey: "admin_dashboard", labelFallback: "Admin", icon: Shield, requiresAdmin: true },
        { id: "admin-orders", href: "/admin/orders", labelKey: "admin_orders", labelFallback: "Incoming Orders", icon: Package, badge: newOrdersCount, requiresAdmin: true },
      ],
    },
  ];
}

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

export default function Sidebar() {
  const { t, lang, setLang } = useLanguage();
  const { itemCount } = useCart();
  const { resolvedTheme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  
  // State
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<{ avatar_url: string | null; name: string | null } | null>(null);
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unreadDMCount, setUnreadDMCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [aboutPanelOpen, setAboutPanelOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Avoid hydration mismatch for theme
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  // ──────────────────────────────────────────────────────────────────────────
  // AUTH & PROFILE FETCHING
  // ──────────────────────────────────────────────────────────────────────────

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

  // ──────────────────────────────────────────────────────────────────────────
  // BADGE COUNTS (Admin orders, unread messages)
  // ──────────────────────────────────────────────────────────────────────────

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

  // Fetch unread DM count (community chat DMs)
  useEffect(() => {
    if (!user) {
      setUnreadDMCount(0);
      return;
    }
    const fetchDMUnread = async () => {
      try {
        const res = await fetch("/api/dm/conversations", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          const count = (data.conversations || []).reduce(
            (sum: number, c: { unread_count: number }) => sum + c.unread_count,
            0
          );
          setUnreadDMCount(count);
        }
      } catch {
        setUnreadDMCount(0);
      }
    };
    fetchDMUnread();
    const interval = setInterval(fetchDMUnread, 30_000);
    return () => clearInterval(interval);
  }, [user]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    // Handle query params (e.g., /adoptions/my-listings?tab=messages)
    const [basePath] = href.split("?");
    return pathname === basePath || pathname.startsWith(basePath + "/");
  };

  const initial = (profile?.name?.trim()?.[0] || "?").toUpperCase();

  // Close panels when navigating
  useEffect(() => {
    setAboutPanelOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  const renderNavItem = (item: NavItem) => {
    // Check visibility requirements
    if (item.requiresAuth && !user) return null;
    if (item.requiresAdmin && !isAdmin) return null;
    // Don't show admin items with 0 badge if they require it
    if (item.id === "admin-orders" && (!item.badge || item.badge === 0)) return null;

    const Icon = item.icon;
    const active = isActive(item.href);
    const label = t(item.labelKey) || item.labelFallback;
    const hasNotification = item.badge && item.badge > 0;

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`flex items-center justify-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-150 lg:justify-start ${
          active 
            ? "bg-mint text-foreground" 
            : hasNotification
              ? "border-2 border-[#f97316] bg-[#fff7ed] text-foreground dark:bg-[#f97316]/10"
              : "text-foreground-muted hover:bg-mint-bg hover:text-foreground"
        }`}
        title={label}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-foreground" : hasNotification ? "text-[#f97316]" : "text-mint"}`} />
        <span className="hidden flex-1 truncate text-sm font-medium lg:block">{label}</span>
        {hasNotification && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1.5 text-[10px] font-bold text-white shadow-sm">
            {item.badge > 9 ? "9+" : item.badge}
          </span>
        )}
      </Link>
    );
  };

  const renderAboutPanelItem = (item: typeof ABOUT_PANEL_CONFIG.company[0]) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    return (
      <Link
        key={item.id}
        href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-150 ${
          active 
            ? "bg-mint text-foreground" 
            : "text-foreground-muted hover:bg-mint-bg hover:text-foreground"
        }`}
        onClick={() => setAboutPanelOpen(false)}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-foreground" : "text-mint"}`} />
        <span className="text-sm font-medium">{item.label}</span>
      </Link>
    );
  };

  // Get navigation config
  const navZones = getNavConfig(user, isAdmin, unreadMessagesCount, newOrdersCount, unreadDMCount);

  // Total badge count for mobile bubble
  const totalBadgeCount = unreadDMCount + unreadMessagesCount + newOrdersCount + (itemCount > 0 ? itemCount : 0);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ════════════════════════════════════════════════════════════════════
          MOBILE: Floating bubble + slide-over menu
      ════════════════════════════════════════════════════════════════════ */}

      {/* Floating bubble - mobile only */}
      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-full border-2 border-mint bg-background shadow-lg transition-colors duration-150 lg:hidden"
        aria-label="Menu"
      >
        {profile?.avatar_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
        ) : user ? (
          <span className="text-sm font-semibold text-foreground">{initial}</span>
        ) : (
          <LogIn className="h-4 w-4 text-navy-soft" />
        )}
        {totalBadgeCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#f97316] px-1 text-[9px] font-bold text-white shadow">
            {totalBadgeCount > 99 ? "99+" : totalBadgeCount}
          </span>
        )}
      </button>

      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile slide-over sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-border-subtle bg-background shadow-xl transition-transform duration-300 ease-out lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
          {!loading && user ? (
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-mint bg-background-secondary text-sm font-semibold text-foreground">
                {profile?.avatar_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span>{initial}</span>
                )}
              </div>
              <span className="truncate text-sm font-semibold text-foreground">{profile?.name || "User"}</span>
            </div>
          ) : !loading ? (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="text-sm font-medium text-navy-soft">
              {t("nav_login")}
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1.5 text-foreground-muted hover:bg-border/30 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-3">
          {navZones.map((zone, zoneIndex) => {
            const visibleItems = zone.items.filter(item => {
              if (item.requiresAuth && !user) return false;
              if (item.requiresAdmin && !isAdmin) return false;
              if (item.id === "admin-orders" && (!item.badge || item.badge === 0)) return false;
              return true;
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={zone.id}>
                {zoneIndex > 0 && <div className="my-3 h-px bg-border-subtle/50" />}
                <div className="space-y-1">
                  {zone.items.map((item) => {
                    if (item.requiresAuth && !user) return null;
                    if (item.requiresAdmin && !isAdmin) return null;
                    if (item.id === "admin-orders" && (!item.badge || item.badge === 0)) return null;
                    const Icon = item.icon;
                    const active = isActive(item.href);
                    const label = t(item.labelKey) || item.labelFallback;
                    const hasNotif = item.badge && item.badge > 0;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-150 ${
                          active
                            ? "bg-mint text-foreground"
                            : hasNotif
                              ? "border-2 border-[#f97316] bg-[#fff7ed] text-foreground dark:bg-[#f97316]/10"
                              : "text-foreground-muted hover:bg-mint-bg hover:text-foreground"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${active ? "text-foreground" : hasNotif ? "text-[#f97316]" : "text-mint"}`} />
                        <span className="flex-1 truncate text-sm font-medium">{label}</span>
                        {hasNotif && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f97316] px-1.5 text-[10px] font-bold text-white">
                            {item.badge! > 9 ? "9+" : item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Cart */}
          {itemCount > 0 && (
            <>
              <div className="my-3 h-px bg-border-subtle/50" />
              <Link
                href="/checkout"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 rounded-xl bg-mint px-3 py-2 text-foreground"
              >
                <div className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral text-[8px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                </div>
                <span className="text-sm font-medium">{t("cart_title")}</span>
              </Link>
            </>
          )}
        </nav>

        {/* Mobile bottom section */}
        <div className="shrink-0 border-t border-border-subtle p-3">
          <button
            type="button"
            onClick={() => { setMobileMenuOpen(false); setAboutPanelOpen(true); }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-foreground-muted hover:bg-mint-bg hover:text-foreground transition-colors"
          >
            <Info className="h-4 w-4 text-mint" />
            <span className="text-sm font-medium">{lang === "el" ? "Σχετικά" : "About Pet-Paw"}</span>
          </button>
          {user && (
            <>
              <Link
                href="/dashboard/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-foreground-muted hover:bg-mint-bg hover:text-foreground transition-colors"
              >
                <Settings className="h-4 w-4 text-mint" />
                <span className="text-sm font-medium">{t("userMenu_settings")}</span>
              </Link>
              <button
                type="button"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-foreground-subtle hover:bg-mint-bg hover:text-foreground transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span className="text-sm font-medium">{t("nav_logout")}</span>
              </button>
            </>
          )}
          {/* Theme & language toggles */}
          <div className="mt-2 flex items-center justify-around">
            <button onClick={() => setTheme(isDark ? "light" : "dark")} className="p-2 text-foreground-muted">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={() => setLang(lang === "el" ? "en" : "el")} className="px-2 py-1 text-xs font-medium text-foreground-muted rounded border border-border">
              {lang === "el" ? "EN" : "ΕΛ"}
            </button>
          </div>
          <p className="mt-2 text-center text-[9px] text-foreground-subtle/50">
            © {new Date().getFullYear()} PetPaw. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          DESKTOP: Fixed sidebar (hidden on mobile)
      ════════════════════════════════════════════════════════════════════ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col border-r border-border-subtle bg-background transition-colors duration-300 lg:flex lg:w-60">
        
        {/* ════════════════════════════════════════════════════════════════════
            MAIN NAVIGATION AREA
        ════════════════════════════════════════════════════════════════════ */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 lg:px-3">
          
          {/* Profile / Login Section */}
          {!loading && (
            <div className="mb-4">
              {user ? (
                <div className="flex items-center justify-center gap-2 rounded-xl px-2 py-2 lg:justify-start">
                  <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-mint bg-background-secondary text-sm font-semibold text-foreground">
                    {profile?.avatar_url ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>
                  <span className="hidden truncate text-sm font-semibold text-foreground lg:block">
                    {profile?.name || "User"}
                  </span>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-navy-soft px-3 py-2 text-navy-soft transition-colors duration-150 hover:bg-mint-bg lg:justify-start"
                  title={t("nav_login")}
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden text-sm font-medium lg:block">{t("nav_login")}</span>
                </Link>
              )}
            </div>
          )}

          {/* Navigation Zones */}
          {navZones.map((zone, zoneIndex) => {
            const visibleItems = zone.items.filter(item => {
              if (item.requiresAuth && !user) return false;
              if (item.requiresAdmin && !isAdmin) return false;
              if (item.id === "admin-orders" && (!item.badge || item.badge === 0)) return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={zone.id}>
                {/* Subtle divider between zones (not before first zone) */}
                {zoneIndex > 0 && (
                  <div className="my-3 h-px bg-border-subtle/50" />
                )}
                <div className="space-y-1">
                  {zone.items.map(renderNavItem)}
                </div>
              </div>
            );
          })}

          {/* Cart - Special item, always visible when has items */}
          {itemCount > 0 && (
            <>
              <div className="my-3 h-px bg-border-subtle/50" />
              <Link
                href="/checkout"
                className="flex items-center justify-center gap-2.5 rounded-xl bg-mint px-3 py-2 text-foreground transition-colors duration-150 hover:bg-mint-hover lg:justify-start"
                title={t("cart_title")}
              >
                <div className="relative">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coral text-[8px] font-bold text-white">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                </div>
                <span className="hidden text-sm font-medium lg:block">{t("cart_title")}</span>
              </Link>
            </>
          )}
        </nav>

        {/* ════════════════════════════════════════════════════════════════════
            BOTTOM SECTION - Meta, Settings, Toggles (All Centered)
        ════════════════════════════════════════════════════════════════════ */}
        <div className="shrink-0 border-t border-border-subtle p-3 transition-colors duration-300">
          
          {/* About Pet-Paw - Opens secondary panel */}
          <button
            type="button"
            onClick={() => setAboutPanelOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-foreground-muted transition-colors duration-150 hover:bg-mint-bg hover:text-foreground"
            title={lang === "el" ? "Σχετικά με το Pet-Paw" : "About Pet-Paw"}
          >
            <Info className="h-4 w-4 text-mint" />
            <span className="hidden text-sm font-medium lg:block">
              {lang === "el" ? "Σχετικά" : "About Pet-Paw"}
            </span>
          </button>

          {/* Account Settings */}
          {user && (
            <Link
              href="/dashboard/settings"
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-foreground-muted transition-colors duration-150 hover:bg-mint-bg hover:text-foreground"
              title={t("userMenu_settings")}
            >
              <Settings className="h-4 w-4 text-mint" />
              <span className="hidden text-sm font-medium lg:block">{t("userMenu_settings")}</span>
            </Link>
          )}

          {/* Theme Toggle - Centered */}
          <div className="flex items-center justify-center gap-2 py-2">
            <Sun 
              className={`h-3.5 w-3.5 cursor-pointer transition-colors ${!isDark ? "text-foreground" : "text-foreground-subtle"}`}
              onClick={() => setTheme("light")}
            />
            <button
              type="button"
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="relative h-5 w-9 rounded-full bg-border p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-1"
              aria-label="Toggle theme"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-mint shadow-sm transition-transform duration-200 ${
                  isDark ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <Moon 
              className={`h-3.5 w-3.5 cursor-pointer transition-colors ${isDark ? "text-foreground" : "text-foreground-subtle"}`}
              onClick={() => setTheme("dark")}
            />
          </div>

          {/* Language Toggle - Centered */}
          <div className="flex items-center justify-center gap-2 py-2">
            <span 
              className={`text-[10px] font-medium transition-colors cursor-pointer ${lang === "el" ? "text-foreground" : "text-foreground-subtle"}`}
              onClick={() => setLang("el")}
            >
              ΕΛ
            </span>
            <button
              type="button"
              onClick={() => setLang(lang === "el" ? "en" : "el")}
              className="relative h-5 w-9 rounded-full bg-border p-0.5 transition-colors focus:outline-none focus:ring-2 focus:ring-mint focus:ring-offset-1"
              aria-label="Toggle language"
            >
              <span
                className={`block h-4 w-4 rounded-full bg-mint shadow-sm transition-transform duration-200 ${
                  lang === "en" ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
            <span 
              className={`text-[10px] font-medium transition-colors cursor-pointer ${lang === "en" ? "text-foreground" : "text-foreground-subtle"}`}
              onClick={() => setLang("en")}
            >
              EN
            </span>
          </div>

          {/* Logout - Centered */}
          {user && (
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-foreground-subtle transition-colors duration-150 hover:bg-mint-bg hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden text-sm font-medium lg:block">{t("nav_logout")}</span>
            </button>
          )}

          {/* Copyright */}
          <p className="mt-2 text-center text-[9px] text-foreground-subtle/50 leading-tight">
            <span className="hidden lg:inline">© {new Date().getFullYear()} PetPaw. All rights reserved.</span>
            <span className="lg:hidden">© {new Date().getFullYear()}</span>
          </p>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          SECONDARY PANEL - About Pet-Paw
          Slides in from the left, overlays the main sidebar
      ════════════════════════════════════════════════════════════════════ */}
      
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          aboutPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setAboutPanelOpen(false)}
      />

      {/* Panel */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-border-subtle bg-background shadow-xl transition-transform duration-300 ease-out ${
          aboutPanelOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-subtle p-4">
          <button
            type="button"
            onClick={() => setAboutPanelOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-mint-bg hover:text-foreground"
            aria-label="Close panel"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold text-foreground">
            {lang === "el" ? "Σχετικά με το Pet-Paw" : "About Pet-Paw"}
          </h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Company Section */}
          <div className="mb-6">
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              {lang === "el" ? "Εταιρεία" : "Company"}
            </h3>
            <div className="space-y-1">
              {ABOUT_PANEL_CONFIG.company.map(renderAboutPanelItem)}
            </div>
          </div>

          {/* Legal Section */}
          <div>
            <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-foreground-subtle">
              {lang === "el" ? "Νομικά" : "Legal"}
            </h3>
            <div className="space-y-1">
              {ABOUT_PANEL_CONFIG.legal.map(renderAboutPanelItem)}
            </div>
          </div>
        </div>

        {/* Panel Footer - Branding */}
        <div className="border-t border-border-subtle p-4">
          <p className="text-center text-xs text-foreground-subtle">
            Pet-Paw © {new Date().getFullYear()}
          </p>
        </div>
      </aside>
    </>
  );
}
