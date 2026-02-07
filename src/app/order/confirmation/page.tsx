"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/contexts/LanguageContext";
import { Suspense } from "react";
import AnimatedButton from "@/components/AnimatedButton";

function OrderConfirmationContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const orderNumber = searchParams.get("order_number") ?? orderId?.slice(0, 8) ?? "";

  if (!orderId) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("confirmation_title")}</h1>
        <p className="mt-4 text-foreground-muted">Order not found. View your orders below.</p>
        <div className="mt-6">
          <AnimatedButton href="/dashboard/orders" variant="primary">
            {t("confirmation_viewOrders")}
          </AnimatedButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-3xl font-bold text-foreground transition-colors duration-300">{t("confirmation_title")}</h1>
      <p className="mt-4 text-lg text-foreground-muted">{t("confirmation_thanks")}</p>
      <p className="mt-2 font-semibold text-foreground">
        {t("confirmation_orderNumber")}: {orderNumber}
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <AnimatedButton href="/dashboard/orders" variant="primary">
          {t("confirmation_viewOrders")}
        </AnimatedButton>
        <AnimatedButton href="/dashboard" variant="outline">
          {t("confirmation_backDashboard")}
        </AnimatedButton>
      </div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-xl px-6 py-16 text-foreground-muted">Loading…</div>}>
      <OrderConfirmationContent />
    </Suspense>
  );
}
