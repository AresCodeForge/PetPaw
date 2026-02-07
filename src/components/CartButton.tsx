"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import AnimatedButton from "@/components/AnimatedButton";

export default function CartButton() {
  const { t } = useLanguage();
  const { items, itemCount, total, removeItem, updateQuantity, clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);

  // Don't render if cart is empty
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      {/* Cart Icon Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center rounded-full bg-mint p-2.5 text-foreground hover:bg-mint-hover transition-colors duration-300"
        aria-label={t("cart_title")}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {/* Item count badge */}
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#f97316] text-xs font-bold text-white">
          {itemCount}
        </span>
      </button>

      {/* Cart Drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={() => setIsOpen(false)}
          />
          {/* Drawer */}
          <div className="fixed right-0 top-0 z-50 h-full w-full max-w-md bg-card shadow-xl transition-colors duration-300">
            <div className="flex h-full flex-col">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <h2 className="text-xl font-bold text-foreground">{t("cart_title")}</h2>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-foreground-muted hover:bg-background-secondary transition-colors duration-300"
                  aria-label={t("common_close")}
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                {items.length === 0 ? (
                  <p className="text-center text-foreground-muted">{t("cart_empty")}</p>
                ) : (
                  <ul className="space-y-4">
                    {items.map((item, index) => (
                      <li
                        key={`${item.type}-${item.product_id ?? index}`}
                        className="flex items-start gap-4 rounded-xl border border-border bg-background-secondary p-4 transition-colors duration-300"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground">{item.name}</h3>
                          <p className="text-sm text-foreground-muted">
                            €{item.price.toFixed(2)} {item.type === "pro_subscription" ? `/ ${t("cart_year")}` : ""}
                          </p>
                          {item.type !== "pro_subscription" && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.type, item.quantity - 1, item.product_id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-background-secondary transition-colors duration-300"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.type, item.quantity + 1, item.product_id)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-background-secondary transition-colors duration-300"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.type, item.product_id)}
                          className="text-amber-600 hover:text-amber-700"
                          aria-label={t("cart_remove")}
                        >
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Footer */}
              {items.length > 0 && (
                <div className="border-t border-border px-6 py-4">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-lg font-semibold text-foreground">{t("cart_total")}</span>
                    <span className="text-lg font-bold text-foreground">€{total.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <AnimatedButton href="/checkout" variant="primary" onClick={() => setIsOpen(false)}>
                      {t("cart_checkout")}
                    </AnimatedButton>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart();
                        setIsOpen(false);
                      }}
                      className="text-sm text-foreground-muted hover:text-amber-600 hover:underline transition-colors duration-300"
                    >
                      {t("cart_clear")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
