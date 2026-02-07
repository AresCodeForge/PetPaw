"use client";

/**
 * Simple wrapper component for admin pages.
 * The actual admin layout (sidebar + header) is handled by src/app/admin/layout.tsx.
 * This component serves as a consistent content wrapper for individual admin pages.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
