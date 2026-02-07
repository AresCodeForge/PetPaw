"use client";

import React from "react";

/** Single paw print SVG – main pad + 4 toe beans */
function PawPrintSvg({
  className,
  style,
}: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden
    >
      {/* Toe beans (top) */}
      <ellipse cx="10" cy="12" rx="4" ry="5" />
      <ellipse cx="22" cy="12" rx="4" ry="5" />
      <ellipse cx="16" cy="8" rx="3.5" ry="4.5" />
      {/* Main pad (bottom) */}
      <ellipse cx="16" cy="22" rx="8" ry="6" />
    </svg>
  );
}

/** One walking trail: a row of paws with staggered step animation */
function Trail({
  paws,
  baseDelay,
  duration,
  className = "",
}: {
  paws: { left: number; top: number; rotation: number }[];
  baseDelay: number;
  duration: number;
  className?: string;
}) {
  return (
    <div className={`absolute left-0 top-0 w-full h-full pointer-events-none ${className}`}>
      {paws.map((p, i) => (
        <div
          key={i}
          className="paw-print absolute text-foreground-subtle/40 dark:text-foreground-subtle/20 transition-colors duration-300"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            transform: `rotate(${p.rotation}deg)`,
            width: "clamp(38px, 5.5vw, 56px)",
            height: "auto",
            aspectRatio: "1",
          }}
        >
          <div
            className="w-full h-full"
            style={{
              animation: `paw-step ${duration}ms ease-in-out infinite`,
              animationDelay: `${baseDelay + i * 280}ms`,
            }}
          >
            <PawPrintSvg className="w-full h-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function PawTrail() {
  /* Diagonal trails: each trail steps in a clear diagonal (left+top change together) */
  // Top-left → bottom-right (4 paws)
  const trail1 = [
    { left: 8, top: 12, rotation: -10 },
    { left: 24, top: 32, rotation: 8 },
    { left: 40, top: 52, rotation: -6 },
    { left: 56, top: 72, rotation: 12 },
  ];
  // Top-right → bottom-left (4 paws)
  const trail2 = [
    { left: 88, top: 18, rotation: 15 },
    { left: 70, top: 40, rotation: -8 },
    { left: 52, top: 62, rotation: 10 },
    { left: 34, top: 82, rotation: -12 },
  ];
  // Bottom-left → top-right (4 paws)
  const trail3 = [
    { left: 12, top: 78, rotation: 8 },
    { left: 32, top: 56, rotation: -14 },
    { left: 52, top: 34, rotation: 10 },
    { left: 72, top: 14, rotation: -8 },
  ];

  return (
    <>
      <Trail paws={trail1} baseDelay={0} duration={3200} />
      <Trail paws={trail2} baseDelay={800} duration={3400} />
      <Trail paws={trail3} baseDelay={400} duration={3600} />
    </>
  );
}
