"use client";

import { useRef, useEffect, useState } from "react";

/**
 * =============================================================================
 * HeroMaskedLogo Component
 * =============================================================================
 * 
 * A modern hero section featuring:
 * - Central logo text that masks a looping video (or animated gradient)
 * - Curved radial callout lines emanating from the logo
 * - Custom text blocks at the end of each curved line
 * 
 * =============================================================================
 * COMPLETE CUSTOMIZATION GUIDE
 * =============================================================================
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 1. LOGO TEXT                                                            │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: logoText (string)                                                 │
 * │ Default: "PETPAW"                                                       │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo logoText="MYBRAND" />                                 │
 * │   <HeroMaskedLogo logoText="🐾 PETS" />  // Emojis work too!            │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 2. VIDEO SOURCE                                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: videoSrc (string)                                                 │
 * │ Default: "/videos/hero-pets.mp4"                                        │
 * │                                                                         │
 * │ Place your MP4 video in /public/videos/ folder.                         │
 * │ If no video exists, an animated gradient displays instead.              │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo videoSrc="/videos/my-video.mp4" />                    │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 3. FALLBACK IMAGE                                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: fallbackImage (string)                                            │
 * │ Default: "/images/hero-fallback.jpg"                                    │
 * │                                                                         │
 * │ Shown if video fails to load.                                           │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo fallbackImage="/images/pets-bg.jpg" />                │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 4. FEATURE CALLOUTS (Custom text at end of curved lines)                │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: features (FeatureCallout[])                                       │
 * │                                                                         │
 * │ Each feature object has:                                                │
 * │   - text: string (REQUIRED) - Your custom text                          │
 * │   - position: string (REQUIRED) - Where the text appears                │
 * │   - icon: string (optional) - Emoji or icon                             │
 * │   - subtext: string (optional) - Smaller secondary text                 │
 * │                                                                         │
 * │ Available positions:                                                    │
 * │   "top-left", "top-right", "bottom-left", "bottom-right",               │
 * │   "left", "right", "top", "bottom"                                      │
 * │                                                                         │
 * │ Example:                                                                │
 * │   const myFeatures = [                                                  │
 * │     {                                                                   │
 * │       text: "Fast & Secure",                                            │
 * │       subtext: "256-bit encryption",                                    │
 * │       position: "top-left",                                             │
 * │       icon: "🔒"                                                        │
 * │     },                                                                  │
 * │     {                                                                   │
 * │       text: "24/7 Support",                                             │
 * │       position: "top-right",                                            │
 * │       icon: "💬"                                                        │
 * │     },                                                                  │
 * │   ];                                                                    │
 * │   <HeroMaskedLogo features={myFeatures} />                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 5. LINE CURVATURE                                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: curvature (number, 0 to 1)                                        │
 * │ Default: 0.6                                                            │
 * │                                                                         │
 * │ 0 = straight lines                                                      │
 * │ 0.3 = subtle curves                                                     │
 * │ 0.6 = moderate curves (default)                                         │
 * │ 1 = very curved                                                         │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo curvature={0.3} />  // Subtle curves                  │
 * │   <HeroMaskedLogo curvature={0.8} />  // Strong curves                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 6. LINE & DOT COLORS                                                    │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Props: lineColor (string), dotColor (string)                            │
 * │ Default: "var(--mint)"                                                  │
 * │                                                                         │
 * │ Use CSS variables or any valid CSS color.                               │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo lineColor="#3b82f6" dotColor="#3b82f6" />             │
 * │   <HeroMaskedLogo lineColor="var(--coral)" />                           │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 7. BACKGROUND                                                           │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: bgClassName (string - Tailwind classes)                           │
 * │ Default: "bg-gradient-to-br from-background via-background-secondary    │
 * │           to-background"                                                │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo bgClassName="bg-slate-900" />                         │
 * │   <HeroMaskedLogo bgClassName="bg-gradient-to-r from-purple-900        │
 * │                                to-indigo-900" />                        │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 8. MINIMUM HEIGHT                                                       │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: minHeight (string - Tailwind classes)                             │
 * │ Default: "min-h-[600px] sm:min-h-[700px] lg:min-h-[800px]"              │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo minHeight="min-h-screen" />                           │
 * │   <HeroMaskedLogo minHeight="min-h-[500px]" />                          │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 9. TEXT STYLING                                                         │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ Prop: textClassName (string - Tailwind classes for callout text)        │
 * │ Default: "text-sm font-medium text-foreground-muted"                    │
 * │                                                                         │
 * │ Example:                                                                │
 * │   <HeroMaskedLogo textClassName="text-base text-white" />               │
 * └─────────────────────────────────────────────────────────────────────────┘
 * 
 * =============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

type FeaturePosition = 
  | "top-left" 
  | "top-right" 
  | "bottom-left" 
  | "bottom-right"
  | "left"
  | "right"
  | "top"
  | "bottom";

interface FeatureCallout {
  /** The main feature description text (REQUIRED) */
  text: string;
  /** Position around the logo where this callout appears (REQUIRED) */
  position: FeaturePosition;
  /** Optional: emoji or icon character */
  icon?: string;
  /** Optional: smaller secondary text below the main text */
  subtext?: string;
}

interface HeroMaskedLogoProps {
  /** The logo text to display (will mask the video) */
  logoText?: string;
  /** Path to the video file */
  videoSrc?: string;
  /** Fallback image if video fails to load */
  fallbackImage?: string;
  /** Array of feature callouts with curved lines */
  features?: FeatureCallout[];
  /** Background className (Tailwind) */
  bgClassName?: string;
  /** Line color for the curved callout lines */
  lineColor?: string;
  /** Dot color at the end of lines */
  dotColor?: string;
  /** Curvature intensity (0 = straight, 1 = very curved) */
  curvature?: number;
  /** Font size class for logo text */
  logoFontSize?: string;
  /** Minimum height of the hero section */
  minHeight?: string;
  /** Text styling for callout labels */
  textClassName?: string;
  /** Whether to show lines on desktop */
  showLines?: boolean;
  /** Whether to show mobile feature grid */
  showMobileFeatures?: boolean;
}

// ============================================================================
// DEFAULT FEATURES - Edit this array to change the default callouts
// ============================================================================

const defaultFeatures: FeatureCallout[] = [
  {
    text: "Instant QR Scanning",
    subtext: "Find lost pets in seconds",
    position: "top-left",
    icon: "📱",
  },
  {
    text: "Real-time Alerts",
    subtext: "Location notifications",
    position: "top-right",
    icon: "📍",
  },
  {
    text: "Health Records",
    subtext: "Secure & accessible",
    position: "left",
    icon: "🏥",
  },
  {
    text: "Community Network",
    subtext: "Neighbors helping neighbors",
    position: "right",
    icon: "🤝",
  },
  {
    text: "Always Accessible",
    subtext: "24/7 profile access",
    position: "bottom-left",
    icon: "🔓",
  },
  {
    text: "Lightweight Tags",
    subtext: "Comfortable for any pet",
    position: "bottom-right",
    icon: "🏷️",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the starting point for a callout line based on position
 * These coordinates are relative to the center of the logo
 */
function getLineOrigin(position: FeaturePosition): { x: number; y: number } {
  const origins: Record<FeaturePosition, { x: number; y: number }> = {
    "top-left": { x: -80, y: -30 },
    "top-right": { x: 80, y: -30 },
    "bottom-left": { x: -80, y: 30 },
    "bottom-right": { x: 80, y: 30 },
    "left": { x: -120, y: 0 },
    "right": { x: 120, y: 0 },
    "top": { x: 0, y: -40 },
    "bottom": { x: 0, y: 40 },
  };
  return origins[position];
}

/**
 * Get the ending point for a callout line based on position
 * These extend to the outer edges where text blocks appear
 * Coordinates are relative to SVG viewBox center (0,0)
 * viewBox is 800x400, so edges are at ±400 horizontally, ±200 vertically
 */
function getLineEnd(position: FeaturePosition): { x: number; y: number } {
  const ends: Record<FeaturePosition, { x: number; y: number }> = {
    "top-left": { x: -350, y: -150 },
    "top-right": { x: 350, y: -150 },
    "bottom-left": { x: -350, y: 150 },
    "bottom-right": { x: 350, y: 150 },
    "left": { x: -380, y: 0 },
    "right": { x: 380, y: 0 },
    "top": { x: 0, y: -180 },
    "bottom": { x: 0, y: 180 },
  };
  return ends[position];
}

/**
 * Generate a curved SVG path between two points
 * Adjust the control point calculation for different curve styles
 */
function getCurvedPath(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curvature: number = 0.5
): string {
  // Calculate the midpoint
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;

  // Calculate perpendicular offset for the control point
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular direction (rotated 90 degrees)
  const perpX = -dy / length;
  const perpY = dx / length;
  
  // Offset the control point perpendicular to the line
  // Adjust this value to change curve intensity
  const offset = length * 0.3 * curvature;
  
  // Alternate curve direction based on position for visual variety
  const curveDirection = startX < 0 ? 1 : -1;
  
  const ctrlX = midX + perpX * offset * curveDirection;
  const ctrlY = midY + perpY * offset * curveDirection;

  return `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
}

/**
 * Get text alignment classes based on position
 */
function getTextAlignment(position: FeaturePosition): string {
  if (position.includes("left")) return "text-right";
  if (position.includes("right")) return "text-left";
  return "text-center";
}

/**
 * Get text block positioning styles - positions text at OUTER edges
 * Uses percentage-based positioning to place text at screen edges
 */
function getTextPosition(position: FeaturePosition): React.CSSProperties {
  // Position text blocks at the outer edges of the container
  const positions: Record<FeaturePosition, React.CSSProperties> = {
    "top-left": {
      position: "absolute",
      top: "15%",
      left: "5%",
      maxWidth: "200px",
    },
    "top-right": {
      position: "absolute",
      top: "15%",
      right: "5%",
      maxWidth: "200px",
    },
    "bottom-left": {
      position: "absolute",
      bottom: "15%",
      left: "5%",
      maxWidth: "200px",
    },
    "bottom-right": {
      position: "absolute",
      bottom: "15%",
      right: "5%",
      maxWidth: "200px",
    },
    "left": {
      position: "absolute",
      top: "50%",
      left: "5%",
      transform: "translateY(-50%)",
      maxWidth: "200px",
    },
    "right": {
      position: "absolute",
      top: "50%",
      right: "5%",
      transform: "translateY(-50%)",
      maxWidth: "200px",
    },
    "top": {
      position: "absolute",
      top: "10%",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "200px",
    },
    "bottom": {
      position: "absolute",
      bottom: "10%",
      left: "50%",
      transform: "translateX(-50%)",
      maxWidth: "200px",
    },
  };

  return positions[position];
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function HeroMaskedLogo({
  logoText = "PETPAW",
  videoSrc = "/videos/hero-pets.mp4",
  fallbackImage = "/images/hero-fallback.jpg",
  features = defaultFeatures,
  bgClassName = "bg-gradient-to-br from-background via-background-secondary to-background",
  lineColor = "var(--mint)",
  dotColor = "var(--mint)",
  curvature = 0.6,
  logoFontSize = "text-7xl sm:text-8xl md:text-9xl lg:text-[12rem]",
  minHeight = "min-h-[600px] sm:min-h-[700px] lg:min-h-[800px]",
  textClassName = "text-sm font-medium text-foreground-muted",
  showLines = true,
  showMobileFeatures = true,
}: HeroMaskedLogoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Handle video loading
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setVideoLoaded(true);
    const handleError = () => setVideoError(true);

    video.addEventListener("canplay", handleCanPlay);
    video.addEventListener("error", handleError);

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
      video.removeEventListener("error", handleError);
    };
  }, []);

  // SVG viewBox dimensions (centered coordinate system)
  const viewBoxWidth = 800;
  const viewBoxHeight = 400;

  return (
    <section
      className={`relative overflow-hidden ${minHeight} ${bgClassName} transition-colors duration-300`}
    >
      {/* ================================================================== */}
      {/* CURVED CALLOUT LINES (SVG Layer - Behind logo on desktop) */}
      {/* ================================================================== */}
      {showLines && (
        <div className="pointer-events-none absolute inset-0 hidden lg:flex items-center justify-center">
          <svg
            viewBox={`${-viewBoxWidth / 2} ${-viewBoxHeight / 2} ${viewBoxWidth} ${viewBoxHeight}`}
            className="h-full w-full max-w-6xl"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Define gradient for lines */}
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={lineColor} stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Render curved lines for each feature */}
            {features.map((feature, index) => {
              const origin = getLineOrigin(feature.position);
              const end = getLineEnd(feature.position);
              const path = getCurvedPath(origin.x, origin.y, end.x, end.y, curvature);

              return (
                <g key={index}>
                  {/* The curved line */}
                  <path
                    d={path}
                    fill="none"
                    stroke="url(#lineGradient)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="opacity-60"
                    style={{
                      // Animate the line drawing
                      strokeDasharray: "1000",
                      strokeDashoffset: "1000",
                      animation: `drawLine 1.5s ease-out ${index * 0.1}s forwards`,
                    }}
                  />
                  
                  {/* Dot at the end of the line */}
                  <circle
                    cx={end.x}
                    cy={end.y}
                    r="5"
                    fill={dotColor}
                    className="opacity-0"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.1 + 1}s forwards`,
                    }}
                  />
                  
                  {/* Small dot at the origin (near logo) */}
                  <circle
                    cx={origin.x}
                    cy={origin.y}
                    r="3"
                    fill={dotColor}
                    className="opacity-0"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.1 + 0.5}s forwards`,
                    }}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* ================================================================== */}
      {/* FEATURE TEXT BLOCKS (Positioned at outer edges of screen) */}
      {/* ================================================================== */}
      {showLines && (
        <div className="pointer-events-none absolute inset-0 hidden lg:block px-8">
          {/* Full-width container for edge-to-edge positioning */}
          <div className="relative h-full w-full">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`${getTextAlignment(feature.position)} opacity-0`}
                style={{
                  ...getTextPosition(feature.position),
                  animation: `fadeInUp 0.5s ease-out ${index * 0.1 + 1.2}s forwards`,
                }}
              >
                {/* Icon */}
                {feature.icon && (
                  <span className="mb-1 block text-2xl">{feature.icon}</span>
                )}
                
                {/* Main text (customizable via textClassName) */}
                <p className={`${textClassName} leading-snug font-semibold`}>
                  {feature.text}
                </p>
                
                {/* Subtext (optional secondary text) */}
                {feature.subtext && (
                  <p className="mt-1 text-xs text-foreground-subtle leading-snug">
                    {feature.subtext}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* CENTRAL MASKED LOGO */}
      {/* ================================================================== */}
      <div className="relative z-10 flex h-full items-center justify-center px-4">
        <div className="relative">
          {/* 
            SVG ClipPath Approach:
            - Define text as a clipPath
            - Apply clip-path to video container
            - Video only shows through the text shape
          */}
          
          {/* Container for sizing */}
          <div 
            className="relative"
            style={{
              width: "clamp(320px, 85vw, 950px)",
              height: "clamp(100px, 22vw, 220px)",
            }}
          >
            {/* SVG with clipPath definition and video inside */}
            <svg 
              className="w-full h-full overflow-visible"
              viewBox="0 0 950 220"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Define the text as a clipPath */}
              <defs>
                <clipPath id="textClipPath">
                  <text
                    x="50%"
                    y="55%"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    style={{
                      fontSize: "180px",
                      fontWeight: 800,
                      fontFamily: "var(--font-alegreya), Alegreya, Georgia, serif",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {logoText}
                  </text>
                </clipPath>
              </defs>

              {/* foreignObject contains the video, clipped to text shape */}
              <foreignObject 
                x="0" 
                y="0" 
                width="100%" 
                height="100%"
                clipPath="url(#textClipPath)"
              >
                <div className="relative w-full h-full">
                  {/* Animated gradient fallback */}
                  <div 
                    className="absolute inset-0 animate-gradient-shift"
                    style={{
                      background: "linear-gradient(135deg, var(--mint) 0%, var(--sky) 25%, var(--coral-soft) 50%, var(--mint) 75%, var(--sky) 100%)",
                      backgroundSize: "400% 400%",
                    }}
                  />

                  {/* Video layer */}
                  {!videoError && (
                    <video
                      ref={videoRef}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        videoLoaded ? "opacity-100" : "opacity-0"
                      }`}
                      onCanPlay={() => setVideoLoaded(true)}
                      onError={() => setVideoError(true)}
                    >
                      <source src={videoSrc} type="video/mp4" />
                    </video>
                  )}

                  {/* Fallback image */}
                  {videoError && fallbackImage && (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${fallbackImage})` }}
                    />
                  )}
                </div>
              </foreignObject>

              {/* Text stroke outline for definition */}
              <text
                x="50%"
                y="55%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="none"
                stroke="var(--border)"
                strokeWidth="2"
                style={{
                  fontSize: "180px",
                  fontWeight: 800,
                  fontFamily: "var(--font-alegreya), Alegreya, Georgia, serif",
                  letterSpacing: "0.02em",
                  opacity: 0.3,
                }}
              >
                {logoText}
              </text>
            </svg>
          </div>

          {/* Glow effect behind the logo */}
          <div
            className="pointer-events-none absolute inset-0 -z-10 blur-3xl scale-150"
            style={{
              background: `radial-gradient(ellipse at center, var(--mint-soft) 0%, transparent 70%)`,
              opacity: 0.5,
            }}
          />
        </div>
      </div>

      {/* ================================================================== */}
      {/* MOBILE FEATURES (Shown below logo on small screens) */}
      {/* ================================================================== */}
      {showMobileFeatures && (
        <div className="relative z-10 px-6 pb-16 lg:hidden">
          <div className="mx-auto max-w-md">
            <div className="grid grid-cols-2 gap-4">
              {features.slice(0, 4).map((feature, index) => (
                <div
                  key={index}
                  className="rounded-xl bg-card/80 p-4 backdrop-blur-sm ring-1 ring-border/50 transition-colors duration-300"
                >
                  {/* Icon */}
                  {feature.icon && (
                    <span className="mb-2 block text-2xl">{feature.icon}</span>
                  )}
                  
                  {/* Main text */}
                  <p className="text-xs font-medium text-foreground-muted leading-snug">
                    {feature.text}
                  </p>
                  
                  {/* Subtext */}
                  {feature.subtext && (
                    <p className="mt-0.5 text-[10px] text-foreground-subtle leading-snug">
                      {feature.subtext}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </section>
  );
}

// ============================================================================
// ALTERNATIVE: Simple Video-Masked Text Component
// Use this if you prefer a simpler implementation without curved lines
// ============================================================================

export function SimpleVideoMaskedLogo({
  logoText = "PETPAW",
  videoSrc = "/videos/hero-pets.mp4",
  bgClassName = "bg-background",
}: {
  logoText?: string;
  videoSrc?: string;
  bgClassName?: string;
}) {
  return (
    <section className={`relative flex min-h-[50vh] items-center justify-center ${bgClassName}`}>
      <div className="relative">
        {/* CSS clip-path approach (simpler, less browser support) */}
        <h1
          className="text-8xl font-black tracking-tighter lg:text-[12rem]"
          style={{
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            backgroundImage: `url(${videoSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {logoText}
        </h1>
      </div>
    </section>
  );
}
