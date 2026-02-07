/**
 * Centralized error codes for the PetPaw application.
 * These codes are returned to clients instead of detailed error messages.
 * Internal details are logged server-side only.
 */

export const ERROR_CODES = {
  // Auth
  E1001: "E1001", // Unauthorized
  E1002: "E1002", // Forbidden
  E1003: "E1003", // Session expired

  // Validation
  E2001: "E2001", // Missing required fields
  E2002: "E2002", // Invalid input format
  E2003: "E2003", // Invalid phone number
  E2004: "E2004", // Invalid email
  E2005: "E2005", // Invalid tier value

  // Resource not found
  E3001: "E3001", // Pet not found
  E3002: "E3002", // User not found
  E3003: "E3003", // Order not found
  E3004: "E3004", // Report not found
  E3005: "E3005", // QR code not found
  E3006: "E3006", // Product not found
  E3007: "E3007", // Address not found
  E3008: "E3008", // Blog post not found
  E3009: "E3009", // Blog category not found
  E3010: "E3010", // Adoption listing not found
  E3011: "E3011", // Conversation not found
  E3012: "E3012", // Message not found
  E3013: "E3013", // Shelter application not found
  E3014: "E3014", // Chat room not found
  E3015: "E3015", // Chat message not found

  // Business logic
  E4001: "E4001", // Pet not marked as lost
  E4002: "E4002", // Pro plan required
  E4003: "E4003", // Rate limit exceeded
  E4004: "E4004", // Max photos reached
  E4005: "E4005", // QR already claimed
  E4006: "E4006", // Already favorited
  E4007: "E4007", // Cannot message own listing
  E4008: "E4008", // Pending application exists
  E4009: "E4009", // Already verified shelter
  E4010: "E4010", // User is banned from chat
  E4011: "E4011", // Message too long
  E4012: "E4012", // Cannot react to own message (optional)
  E4013: "E4013", // Message blocked by moderation
  E4014: "E4014", // Rate limit exceeded for messages
  E4015: "E4015", // User is blocked
  E4016: "E4016", // Chat consent required
  E4017: "E4017", // Cannot block yourself

  // Database
  E5001: "E5001", // Database query failed
  E5002: "E5002", // Insert failed
  E5003: "E5003", // Update failed
  E5004: "E5004", // Delete failed

  // File/Storage
  E6001: "E6001", // Upload failed
  E6002: "E6002", // File too large
  E6003: "E6003", // Invalid file type

  // Server
  E9001: "E9001", // Internal server error
  E9002: "E9002", // Service unavailable
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/**
 * Log error details server-side without exposing to client.
 * Returns a safe error object for the response.
 */
export function logAndCreateError(
  code: ErrorCode,
  context: string,
  details?: unknown
): { error: string; code: string } {
  // Log full details server-side only (in production, use a logging service)
  const safeDetails =
    details instanceof Error
      ? { message: details.message, name: details.name }
      : details;

  console.error(`[PetPaw] ${context}`, { code, details: safeDetails });

  return { error: code, code };
}

/**
 * Create error response without logging (for expected errors like validation).
 */
export function createError(code: ErrorCode): { error: string; code: string } {
  return { error: code, code };
}

/**
 * Get i18n key for an error code.
 * Use with translations: t(getErrorKey(code))
 */
export function getErrorKey(code: string): string {
  // Check if it's a known error code
  if (code in ERROR_CODES) {
    return `error_${code}`;
  }
  return "error_unknown";
}
