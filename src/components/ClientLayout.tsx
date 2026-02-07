"use client";

import { type ReactNode } from "react";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CartProvider } from "@/contexts/CartContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import Sidebar from "@/components/Sidebar";

export default function ClientLayout({ children }: { children: ReactNode }) {

  return (
    <ThemeProvider>
      <LanguageProvider>
        <CartProvider>
          {/* Persistent Sidebar */}
          <Sidebar />

          {/* Main content area - offset by sidebar width */}
          <div className="lg:ml-60 relative z-10 flex flex-col h-screen overflow-hidden bg-background transition-colors duration-300">
            {/* Scrollable content area - no padding, seamless background */}
            <main 
              id="main-content" 
              className="relative z-10 min-w-0 flex-1 overflow-y-auto" 
              tabIndex={-1}
            >
              {children}
            </main>
          </div>
        </CartProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
