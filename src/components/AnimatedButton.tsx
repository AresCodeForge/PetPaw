"use client";

import Link from "next/link";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "sky" | "orange" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface AnimatedButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}

const AnimatedButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, AnimatedButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      href,
      onClick,
      type = "button",
      disabled = false,
      className = "",
      ariaLabel,
    },
    ref
  ) => {
    const variantClass = `btn-animated--${variant}`;
    const sizeClass = size !== "md" ? `btn-animated--${size}` : "";
    const classes = `btn-animated ${variantClass} ${sizeClass} ${className}`.trim();

    if (href && !disabled) {
      return (
        <Link
          href={href}
          className={classes}
          onClick={onClick as (e: React.MouseEvent<HTMLAnchorElement>) => void}
          aria-label={ariaLabel}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          <span className="btn-animated__text">{children}</span>
          <span className="btn-animated__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </Link>
      );
    }

    return (
      <button
        type={type}
        className={classes}
        onClick={onClick as (e: React.MouseEvent<HTMLButtonElement>) => void}
        disabled={disabled}
        aria-label={ariaLabel}
        ref={ref as React.Ref<HTMLButtonElement>}
      >
        <span className="btn-animated__text">{children}</span>
        <span className="btn-animated__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </span>
      </button>
    );
  }
);

AnimatedButton.displayName = "AnimatedButton";

export default AnimatedButton;
