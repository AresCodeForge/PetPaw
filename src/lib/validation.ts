/**
 * Shared validation and sanitization for user input across the site.
 */

/** Phone: optional +, digits, spaces, dashes; 6–20 chars (international) */
const PHONE_REGEX = /^\+?[0-9\s\-]{6,20}$/;

export function isValidPhone(phone: string): boolean {
  const trimmed = phone.trim();
  if (trimmed.length < 6 || trimmed.length > 20) return false;
  return PHONE_REGEX.test(trimmed.replace(/\s/g, " "));
}

/** Sanitize string for display/DB: limit length, strip control chars */
const MAX_NAME_LENGTH = 200;
const MAX_TEXT_LENGTH = 2000;
const MAX_SHORT_TEXT_LENGTH = 500;
const CONTROL_OR_INVALID = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function sanitizeName(value: string): string {
  return value.replace(CONTROL_OR_INVALID, "").trim().slice(0, MAX_NAME_LENGTH);
}

export function sanitizeText(value: string, maxLength: number = MAX_TEXT_LENGTH): string {
  return value.replace(CONTROL_OR_INVALID, "").trim().slice(0, maxLength);
}

export function sanitizeShortText(value: string): string {
  return sanitizeText(value, MAX_SHORT_TEXT_LENGTH);
}

/** Email: basic format check + length */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length <= MAX_EMAIL_LENGTH && EMAIL_REGEX.test(trimmed);
}

export function sanitizeEmail(value: string): string {
  return value.replace(CONTROL_OR_INVALID, "").trim().slice(0, MAX_EMAIL_LENGTH);
}

/** Address line: alphanumeric, spaces, punctuation; no control chars */
const MAX_ADDRESS_LINE = 200;

export function sanitizeAddressLine(value: string): string {
  return value.replace(CONTROL_OR_INVALID, "").trim().slice(0, MAX_ADDRESS_LINE);
}

/** Postal code: flexible (letters, digits, spaces, dash); max 20 */
const MAX_POSTAL_LENGTH = 20;

export function sanitizePostalCode(value: string): string {
  return value.replace(CONTROL_OR_INVALID, "").trim().slice(0, MAX_POSTAL_LENGTH);
}

export const VALIDATION = {
  MAX_NAME_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_EMAIL_LENGTH,
  MAX_ADDRESS_LINE,
  MAX_POSTAL_LENGTH,
} as const;
