'use client'

interface CopilotProviderProps {
  children: React.ReactNode
}

/**
 * Placeholder provider - CopilotKit chat removed (not working)
 * Voice interaction via Hume is the primary interface
 */
export function CopilotProvider({ children }: CopilotProviderProps) {
  return <>{children}</>
}
