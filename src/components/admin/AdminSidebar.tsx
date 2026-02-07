"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  QrCode,
  FileText,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  PawPrint,
  BarChart3,
  Bell,
  Shield,
  Heart,
  Building2,
  MessagesSquare,
} from "lucide-react";

type NavItem = {
  title: string;
  titleEl: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    titleEl: "Πίνακας Ελέγχου",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    titleEl: "Χρήστες",
    href: "/admin/users",
    icon: Users,
  },
  {
    title: "Orders",
    titleEl: "Παραγγελίες",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    title: "QR Codes",
    titleEl: "Κωδικοί QR",
    href: "/admin/qr-batch",
    icon: QrCode,
  },
  {
    title: "Blog Posts",
    titleEl: "Άρθρα",
    href: "/admin/blog",
    icon: FileText,
  },
  {
    title: "Comments",
    titleEl: "Σχόλια",
    href: "/admin/comments",
    icon: MessageSquare,
  },
  {
    title: "Adoptions",
    titleEl: "Υιοθεσίες",
    href: "/admin/adoptions",
    icon: Heart,
  },
  {
    title: "Shelters",
    titleEl: "Καταφύγια",
    href: "/admin/shelters",
    icon: Building2,
  },
  {
    title: "Chat",
    titleEl: "Συνομιλία",
    href: "/admin/chat",
    icon: MessagesSquare,
  },
  {
    title: "Reports",
    titleEl: "Αναφορές",
    href: "/admin/reports",
    icon: Shield,
  },
];

const secondaryNavItems: NavItem[] = [
  {
    title: "Analytics",
    titleEl: "Αναλύσεις",
    href: "/admin/analytics",
    icon: BarChart3,
  },
  {
    title: "Notifications",
    titleEl: "Ειδοποιήσεις",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    title: "Settings",
    titleEl: "Ρυθμίσεις",
    href: "/admin/settings",
    icon: Settings,
  },
];

type Props = {
  className?: string;
};

export default function AdminSidebar({ className }: Props) {
  const { lang } = useLanguage();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const title = lang === "el" ? item.titleEl : item.title;
    const Icon = item.icon;

    const linkContent = (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-300",
          active
            ? "bg-navy-soft text-white"
            : "text-foreground-muted hover:bg-background-secondary hover:text-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed && <span>{title}</span>}
        {!collapsed && item.badge && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs text-white">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {title}
            {item.badge && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs text-white">
                {item.badge}
              </span>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border bg-card transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          className
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint">
                <PawPrint className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-foreground">PetPaw</span>
              <span className="rounded bg-navy-soft px-1.5 py-0.5 text-xs font-medium text-white">
                Admin
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="mx-auto">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint">
                <PawPrint className="h-5 w-5 text-white" />
              </div>
            </Link>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>

          <Separator className="my-4" />

          <nav className="flex flex-col gap-1">
            {secondaryNavItems.map((item) => (
              <NavLink key={item.href} item={item} />
            ))}
          </nav>
        </ScrollArea>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className={cn("w-full", collapsed && "px-2")}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="ml-2">
                  {lang === "el" ? "Σύμπτυξη" : "Collapse"}
                </span>
              </>
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
