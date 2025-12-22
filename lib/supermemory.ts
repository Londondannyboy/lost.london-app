/**
 * Supermemory integration for VIC - persistent user memory
 * Enables VIC to remember returning users and personalize greetings
 *
 * NOTE: All API calls go through our server-side routes to keep the API key secure
 */

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface UserProfile {
  isReturningUser: boolean
  lastVisit?: string
  topicsDiscussed?: string[]
  conversationCount?: number
  profile?: string
}

/**
 * Generate or retrieve user ID from localStorage
 */
export function getUserId(): string {
  if (typeof window === 'undefined') return ''

  let userId = localStorage.getItem('vic_user_id')
  if (!userId) {
    userId = `vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    localStorage.setItem('vic_user_id', userId)
  }
  return userId
}

/**
 * Get user profile to check if returning user
 * Calls our server-side API route (keeps Supermemory key secure)
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  if (!userId) {
    return { isReturningUser: false }
  }

  try {
    const response = await fetch('/api/memory/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })

    if (!response.ok) {
      return { isReturningUser: false }
    }

    return await response.json()
  } catch (error) {
    console.error('[Supermemory] Profile fetch error:', error)
    return { isReturningUser: false }
  }
}

/**
 * Store conversation in Supermemory
 * Calls our server-side API route (keeps Supermemory key secure)
 */
export async function storeConversation(
  userId: string,
  conversationId: string,
  messages: Message[],
  topicsDiscussed: string[] = []
): Promise<boolean> {
  if (!userId || messages.length === 0) {
    return false
  }

  try {
    const response = await fetch('/api/memory/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        conversationId,
        messages,
        topicsDiscussed,
      }),
    })

    if (!response.ok) {
      throw new Error('Conversation store failed')
    }

    const data = await response.json()
    if (data.success) {
      console.log('[Supermemory] Conversation stored successfully')
    }
    return data.success
  } catch (error) {
    console.error('[Supermemory] Conversation store error:', error)
    return false
  }
}

/**
 * Store a specific memory about the user (name, interests, preferences)
 * Calls our server-side API route (keeps Supermemory key secure)
 */
export async function rememberAboutUser(
  userId: string,
  memory: string,
  type: 'name' | 'interest' | 'preference' | 'general' = 'general'
): Promise<boolean> {
  if (!userId || !memory) {
    return false
  }

  try {
    const response = await fetch('/api/memory/remember', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, memory, type }),
    })

    if (!response.ok) {
      throw new Error('Remember failed')
    }

    const data = await response.json()
    if (data.success) {
      console.log('[Supermemory] Memory stored:', type, memory)
    }
    return data.success
  } catch (error) {
    console.error('[Supermemory] Remember error:', error)
    return false
  }
}

/**
 * Generate a personalized greeting based on user profile
 */
export function generatePersonalizedGreeting(profile: UserProfile): string {
  if (!profile.isReturningUser) {
    return '' // Use default greeting
  }

  const greetings = [
    "Welcome back! ",
    "Good to see you again! ",
    "Ah, you've returned! ",
  ]

  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)]

  if (profile.topicsDiscussed && profile.topicsDiscussed.length > 0) {
    const lastTopic = profile.topicsDiscussed[profile.topicsDiscussed.length - 1]
    return `${randomGreeting}Last time we talked about ${lastTopic}. Shall we continue, or explore something new?`
  }

  if (profile.conversationCount && profile.conversationCount > 1) {
    return `${randomGreeting}This is conversation number ${profile.conversationCount + 1}. What aspect of London's history shall we explore today?`
  }

  return `${randomGreeting}What would you like to discover about London today?`
}
