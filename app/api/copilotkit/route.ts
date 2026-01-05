import { NextRequest } from 'next/server'
import {
  CopilotRuntime,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime'

/**
 * CopilotKit Runtime Endpoint - Full Agent Mode
 *
 * Architecture:
 * - All LLM + tools handled by VIC CLM (Pydantic AI + Groq/Llama)
 * - Same backend serves both Hume voice and CopilotKit text
 * - Unified experience: article search, Zep memory, VIC persona
 *
 * The CLM uses Pydantic AI's to_ag_ui() to expose a full agent,
 * not just actions. This means:
 * - LLM calls happen on CLM (Groq/Llama - super fast)
 * - Tools (article search) run on CLM
 * - State syncs via AG-UI protocol
 */

// Get the CLM remote endpoint URL
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
    endpoint: '/api/copilotkit',
  })

  return handleRequest(req)
}
