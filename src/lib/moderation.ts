/**
 * Content moderation utilities for chat
 * Includes profanity filtering and illegal content detection
 */

// Common profanity words (English and Greek) - expandable list
// This is a basic list - in production, use a comprehensive database or API
const PROFANITY_LIST_EN = [
  // English profanity (common ones, can be expanded)
  "fuck", "shit", "ass", "bitch", "damn", "crap", "bastard", "dick", "cock",
  "pussy", "cunt", "whore", "slut", "fag", "nigger", "nigga", "retard",
  // Variations and l33t speak
  "f*ck", "sh*t", "b*tch", "a$$", "d!ck", "fuk", "fck", "sht", "btch",
];

const PROFANITY_LIST_EL = [
  // Greek profanity (common ones)
  "γαμώ", "σκατά", "πούστη", "μαλάκα", "αρχίδι", "μουνί", "πουτάνα",
  "καριόλη", "γαμημένο", "διάολε", "άντε γαμήσου",
];

const ALL_PROFANITY = [...PROFANITY_LIST_EN, ...PROFANITY_LIST_EL];

// Patterns for potentially illegal content
const ILLEGAL_PATTERNS = [
  // Drug-related
  /\b(buy|sell|selling)\s*(drugs?|cocaine|heroin|meth|weed|marijuana)\b/i,
  /\b(dealer|dealing)\b/i,
  // Weapons
  /\b(buy|sell|selling)\s*(guns?|weapons?|firearms?)\b/i,
  // Child exploitation (flag for review)
  /\b(cp|child\s*porn|underage)\b/i,
  // Violence threats
  /\b(kill\s*you|murder\s*you|gonna\s*die)\b/i,
  // Scams
  /\b(send\s*money|wire\s*transfer|western\s*union|bitcoin\s*wallet)\b/i,
  /\b(nigerian\s*prince|lottery\s*winner)\b/i,
];

// Spam patterns
const SPAM_PATTERNS = [
  /(.)\1{5,}/i, // Repeated characters (e.g., "aaaaaaa")
  /\b(click\s*here|free\s*money|earn\s*\$|make\s*money\s*fast)\b/i,
  /(https?:\/\/[^\s]+){3,}/i, // Multiple URLs
  /\b(subscribe|follow\s*me|check\s*my\s*profile)\b/i,
];

export type ModerationResult = {
  isClean: boolean;
  hasProfanity: boolean;
  hasIllegalContent: boolean;
  hasSpam: boolean;
  filteredContent: string;
  flags: string[];
};

/**
 * Check and filter text content for profanity and illegal content
 */
export function moderateText(content: string): ModerationResult {
  const flags: string[] = [];
  let filteredContent = content;
  let hasProfanity = false;
  let hasIllegalContent = false;
  let hasSpam = false;

  // Normalize content for checking
  const lowerContent = content.toLowerCase();

  // Check for profanity
  for (const word of ALL_PROFANITY) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
    if (regex.test(lowerContent)) {
      hasProfanity = true;
      // Replace with asterisks
      filteredContent = filteredContent.replace(regex, (match) => 
        match[0] + "*".repeat(match.length - 2) + match[match.length - 1]
      );
      flags.push(`profanity:${word}`);
    }
  }

  // Check for illegal content patterns
  for (const pattern of ILLEGAL_PATTERNS) {
    if (pattern.test(content)) {
      hasIllegalContent = true;
      flags.push(`illegal:${pattern.source}`);
    }
  }

  // Check for spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(content)) {
      hasSpam = true;
      flags.push(`spam:${pattern.source}`);
    }
  }

  return {
    isClean: !hasProfanity && !hasIllegalContent && !hasSpam,
    hasProfanity,
    hasIllegalContent,
    hasSpam,
    filteredContent,
    flags,
  };
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Rate limiting check - counts messages in a time window
 * @param userId - The user's ID
 * @param supabaseAdmin - Supabase admin client
 * @param table - Table to check (chat_messages or dm_messages)
 * @param userIdColumn - Column name for user ID (user_id or sender_id)
 * @param windowSeconds - Time window in seconds (default 60)
 * @param maxMessages - Maximum messages in window (default 10)
 */
export async function checkRateLimit(
  userId: string,
  supabaseAdmin: { from: (table: string) => { select: (...args: unknown[]) => { eq: (...args: unknown[]) => { gte: (...args: unknown[]) => Promise<{ count: number | null }> } } } },
  table: "chat_messages" | "dm_messages" = "chat_messages",
  userIdColumn: "user_id" | "sender_id" = "user_id",
  windowSeconds: number = 60,
  maxMessages: number = 10
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabaseAdmin as any)
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq(userIdColumn, userId)
    .gte("created_at", since);

  const currentCount = count ?? 0;
  if (currentCount >= maxMessages) {
    return { allowed: false, retryAfterSeconds: windowSeconds };
  }

  return { allowed: true };
}

/**
 * Server-side moderation check for API routes
 */
export function serverModerateText(content: string): {
  allowed: boolean;
  filteredContent: string;
  requiresReview: boolean;
  reason?: string;
} {
  const result = moderateText(content);
  
  // Block if illegal content detected
  if (result.hasIllegalContent) {
    return {
      allowed: false,
      filteredContent: content,
      requiresReview: true,
      reason: "Content flagged for review",
    };
  }
  
  // Allow but filter profanity
  return {
    allowed: true,
    filteredContent: result.filteredContent,
    requiresReview: result.hasProfanity || result.hasSpam,
  };
}
