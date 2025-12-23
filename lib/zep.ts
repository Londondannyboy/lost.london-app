/**
 * Zep Cloud client configuration for VIC Lost London
 * Provides knowledge graph and user memory capabilities
 */

import { ZepClient } from "@getzep/zep-cloud";

// Graph ID for all London history content
export const LOST_LONDON_GRAPH_ID = "lost-london";

// Create Zep client - initialized lazily to avoid build-time errors
let zepClientInstance: ZepClient | null = null;

export function getZepClient(): ZepClient {
  if (!zepClientInstance) {
    const apiKey = process.env.ZEP_API_KEY;
    if (!apiKey) {
      throw new Error("ZEP_API_KEY environment variable is not set");
    }
    zepClientInstance = new ZepClient({ apiKey });
  }
  return zepClientInstance;
}

/**
 * Search the Lost London knowledge graph
 */
export async function searchKnowledgeGraph(
  query: string,
  options: {
    limit?: number;
    scope?: "edges" | "nodes";
    reranker?: "rrf" | "mmr" | "episode_mentions";
  } = {}
) {
  const client = getZepClient();
  const { limit = 10, scope = "edges", reranker = "rrf" } = options;

  const results = await client.graph.search({
    graphId: LOST_LONDON_GRAPH_ID,
    query,
    limit,
    scope,
    reranker,
  });

  return results;
}

/**
 * Search user-specific graph (for personalization and memory)
 */
export async function searchUserGraph(
  userId: string,
  query: string,
  options: {
    limit?: number;
    scope?: "edges" | "nodes";
  } = {}
) {
  const client = getZepClient();
  const { limit = 10, scope = "edges" } = options;

  const results = await client.graph.search({
    userId,
    query,
    limit,
    scope,
  });

  return results;
}

/**
 * Add a message to user's memory graph
 * Zep automatically extracts facts and entities
 */
export async function addUserMessage(
  userId: string,
  message: string,
  role: "user" | "assistant" = "user",
  name?: string
) {
  const client = getZepClient();

  // Format as speaker-attributed message
  const formattedMessage = name
    ? `${name} (${role}): ${message}`
    : `${role}: ${message}`;

  const result = await client.graph.add({
    userId,
    type: "message",
    data: formattedMessage,
  });

  return result;
}

/**
 * Get user profile from their graph (facts about them)
 */
export async function getUserFacts(userId: string, limit = 20) {
  const client = getZepClient();

  // Search for facts about this user
  const results = await client.graph.search({
    userId,
    query: "user preferences interests name",
    limit,
    scope: "edges",
  });

  return results;
}

/**
 * Add text content to the Lost London knowledge graph
 */
export async function addToKnowledgeGraph(
  content: string,
  metadata?: { title?: string; source?: string }
) {
  const client = getZepClient();

  // Prepend metadata if provided
  let data = content;
  if (metadata?.title) {
    data = `Article: ${metadata.title}\n\n${content}`;
  }

  const result = await client.graph.add({
    graphId: LOST_LONDON_GRAPH_ID,
    type: "text",
    data,
  });

  return result;
}

/**
 * Ensure user exists in Zep
 */
export async function ensureUser(userId: string, email?: string) {
  const client = getZepClient();

  try {
    // Try to get existing user
    await client.user.get(userId);
  } catch {
    // User doesn't exist, create them
    await client.user.add({
      userId,
      email,
    });
  }
}

/**
 * Create the Lost London graph if it doesn't exist
 */
export async function ensureGraph() {
  const client = getZepClient();

  try {
    await client.graph.get(LOST_LONDON_GRAPH_ID);
    console.log(`Graph '${LOST_LONDON_GRAPH_ID}' already exists`);
  } catch {
    // Graph doesn't exist, create it
    await client.graph.create({
      graphId: LOST_LONDON_GRAPH_ID,
    });
    console.log(`Created graph '${LOST_LONDON_GRAPH_ID}'`);
  }
}
