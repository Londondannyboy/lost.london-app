/**
 * Zep memory integration for VIC - persistent user memory
 *
 * How it works:
 * - Zep automatically extracts facts from conversations
 * - No explicit "remember" calls needed
 * - Just send messages, Zep handles the rest
 */

export interface UserProfile {
  isReturningUser: boolean;
  userName?: string;
  interests?: string[];
  facts?: Array<{ fact: string }>;
}

/**
 * Generate or retrieve user ID from localStorage
 */
export function getUserId(): string {
  if (typeof window === "undefined") return "";

  let userId = localStorage.getItem("vic_user_id");
  if (!userId) {
    userId = `vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem("vic_user_id", userId);
  }
  return userId;
}

/**
 * Get user profile from Zep
 * Zep automatically extracts facts about the user from conversations
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    return { isReturningUser: false };
  }

  try {
    const response = await fetch(`/api/zep/user?userId=${encodeURIComponent(userId)}`);

    if (!response.ok) {
      return { isReturningUser: false };
    }

    const data = await response.json();
    return {
      isReturningUser: data.isReturningUser,
      userName: data.userName,
      interests: data.interests,
      facts: data.facts,
    };
  } catch (error) {
    console.error("[Zep] Profile fetch error:", error);
    return { isReturningUser: false };
  }
}

/**
 * Store a conversation message in Zep
 * Zep automatically extracts facts - no explicit "remember" call needed
 */
export async function storeMessage(
  userId: string,
  message: string,
  role: "user" | "assistant" = "user",
  name?: string
): Promise<boolean> {
  if (!userId || !message) {
    return false;
  }

  try {
    const response = await fetch("/api/zep/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, message, role, name }),
    });

    if (!response.ok) {
      throw new Error("Message store failed");
    }

    const data = await response.json();
    if (data.success) {
      console.log("[Zep] Message stored, facts will be extracted automatically");
    }
    return data.success;
  } catch (error) {
    console.error("[Zep] Store message error:", error);
    return false;
  }
}

/**
 * Search the Lost London knowledge graph
 */
export async function searchKnowledge(
  query: string,
  limit = 10
): Promise<{ edges: Array<{ fact?: string }>; nodes: Array<{ name?: string }> }> {
  try {
    const response = await fetch("/api/zep/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, limit }),
    });

    if (!response.ok) {
      throw new Error("Search failed");
    }

    return await response.json();
  } catch (error) {
    console.error("[Zep] Search error:", error);
    return { edges: [], nodes: [] };
  }
}

/**
 * Generate a personalized greeting based on user profile
 */
export function generatePersonalizedGreeting(profile: UserProfile): string {
  if (!profile.isReturningUser) {
    return ""; // Use default greeting
  }

  const name = profile.userName || "";
  const nameGreeting = name ? `, ${name}` : "";

  // Build greeting with name and interests
  if (name && profile.interests && profile.interests.length > 0) {
    const interest = profile.interests[0];
    return `Welcome back${nameGreeting}! Last time you were interested in ${interest}. Shall we continue exploring that, or discover something new?`;
  }

  if (name) {
    return `Welcome back${nameGreeting}! Lovely to hear from you again. What aspect of London's history shall we explore today?`;
  }

  if (profile.interests && profile.interests.length > 0) {
    const interest = profile.interests[0];
    return `Welcome back! I remember you were interested in ${interest}. Shall we continue, or explore something new?`;
  }

  return `Welcome back! What would you like to discover about London today?`;
}
