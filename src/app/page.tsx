"use client";

import HeroMaskedLogo from "@/components/HeroMaskedLogo";

/**
 * =============================================================================
 * HOMEPAGE - Hero Logo Only
 * =============================================================================
 * 
 * To customize the hero section, modify the props passed to <HeroMaskedLogo />
 * 
 * 1. CHANGE LOGO TEXT: Set the `logoText` prop
 * 2. CHANGE VIDEO: Set the `videoSrc` prop (place video in /public/videos/)
 * 3. CHANGE BACKGROUND: Set `bgClassName` with Tailwind gradient/color classes
 * =============================================================================
 */

export default function Home() {
  return (
    <HeroMaskedLogo
      logoText="PETPAW"
      videoSrc="/videos/hero-pets.mp4"
      fallbackImage="/images/hero-fallback.jpg"
      features={[]}
      showLines={false}
      showMobileFeatures={false}
      bgClassName="bg-gradient-to-br from-background via-background-secondary to-background"
      minHeight="h-full"
    />
  );
}
