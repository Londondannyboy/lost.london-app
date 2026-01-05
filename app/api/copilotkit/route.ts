import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime Endpoint - Hybrid Setup
 *
 * Architecture:
 * - LLM calls: Gemini (via GoogleGenerativeAIAdapter)
 * - Actions: VIC CLM backend (article search, etc.)
 *
 * This gives us:
 * - Fast, capable chat via Gemini
 * - Access to CLM's article search and tools
 * - Same actions available to both voice (Hume) and text (CopilotKit)
 */

// Get the CLM remote endpoint URL for actions
const getRemoteEndpoint = () => {
  if (process.env.COPILOTKIT_REMOTE_ENDPOINT) {
    return process.env.COPILOTKIT_REMOTE_ENDPOINT
  }
  return 'http://localhost:8000/copilotkit'
}

const runtime = new CopilotRuntime({
  remoteEndpoints: [
    {
      url: getRemoteEndpoint(),
    },
  ],
})

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new GoogleGenerativeAIAdapter({
      model: 'gemini-2.0-flash-exp',
    }),
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
