/**
 * Privacy utilities for masking sensitive data
 */

/**
 * Mask an email address for display in admin views
 * Example: "john.doe@gmail.com" → "j***e@gmail.com"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  
  const atIndex = email.indexOf("@");
  if (atIndex === -1) return "***";
  
  const local = email.substring(0, atIndex);
  const domain = email.substring(atIndex + 1);
  
  if (local.length <= 2) {
    // Very short local part: just show first char + ***
    return `${local.charAt(0)}***@${domain}`;
  }
  
  // Show first and last character of local part
  const maskedLocal = `${local.charAt(0)}***${local.charAt(local.length - 1)}`;
  return `${maskedLocal}@${domain}`;
}