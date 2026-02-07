import type { Metadata, Viewport } from "next";
import { Alegreya, Alegreya_Sans, Poppins } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import PawTrail from "@/components/PawTrail";

// Alegreya - Main font for body text (supports Greek + Latin)
const alegreya = Alegreya({
  variable: "--font-alegreya",
  subsets: ["latin", "greek"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

// Alegreya Sans - For UI elements and headings (supports Greek + Latin)
const alegreyaSans = Alegreya_Sans({
  variable: "--font-alegreya-sans",
  subsets: ["latin", "greek"],
  weight: ["400", "500", "700", "800", "900"],
  style: ["normal", "italic"],
});

// Poppins for logo/branding - matches the PetPaw logo style
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "PetPaw — Έξυπνη ταυτότητα για το κατοικίδιό σας",
  description:
    "Έξυπνη λύση για ιδιοκτήτες κατοικιδίων. Προσαρτήστε ένα μπρελόκ QR που σκανάρεται στο λουρί του κατοικίδιού σας ώστε ο καθένας να βλέπει τις πληροφορίες του όταν το βρει.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={`${alegreya.variable} ${alegreyaSans.variable} ${poppins.variable}`} suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased font-sans transition-colors duration-300">
        {/* ════════════════════════════════════════════════════════════════════
            ACCESSIBILITY: Skip to main content link
            Visible only on keyboard focus for screen reader and keyboard users
        ════════════════════════════════════════════════════════════════════ */}
        <a
          href="#main-content"
          className="skip-to-content"
        >
          Skip to main content
        </a>

        {/* Animated pet-friendly background: blobs + walking paw trails (pointer-events-none so links/buttons work) */}
        <div className="fixed inset-0 overflow-hidden z-0 pointer-events-none dark:opacity-30 transition-opacity duration-300" aria-hidden="true">
          <div className="bg-blob bg-blob--1" />
          <div className="bg-blob bg-blob--2" />
          <div className="bg-blob bg-blob--3" />
          <div className="bg-blob bg-blob--4" />
          <div className="bg-blob bg-blob--5" />
          <PawTrail />
        </div>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
