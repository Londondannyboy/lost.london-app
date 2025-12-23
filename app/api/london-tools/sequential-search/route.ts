/**
 * Sequential Search API v2 - Zep-guided discovery with pgvector detail
 *
 * IMPROVEMENTS:
 * 1. Embedding Cache - Reuses embeddings for common queries (speed boost)
 * 2. Interest Weighting - Boosts results matching user's known interests
 * 3. Fast-First Response - Primary content ready immediately, enrichment for follow-ups
 *
 * Flow:
 * 1. Query Zep to discover related entities and their connections
 * 2. Check embedding cache before calling Voyage AI
 * 3. Weight results by user interests (if provided)
 * 4. Return structured response: immediate (speak now) + followUp (offer later)
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { ZepClient } from "@getzep/zep-cloud";

const sql = neon(process.env.DATABASE_URL!);
const LOST_LONDON_GRAPH_ID = "lost-london";
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

// Types
interface DiscoveredEntity {
  name: string;
  type: string;
  summary: string;
  relevanceScore: number;
  interestMatch?: boolean; // True if matches user's known interests
}

interface ArticleResult {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  source_type: string;
  similarity: number;
  slug?: string;
  url?: string;
  interestBoost?: boolean;
}

interface EntityWithContent extends DiscoveredEntity {
  articles: ArticleResult[];
  relatedFacts: string[];
}

// Response structured for voice AI - what to say now vs offer later
interface SequentialSearchResponse {
  query: string;

  // IMMEDIATE: What VIC should talk about right now
  immediate: {
    topic: EntityWithContent | null;
    // Key facts VIC should mention
    keyFacts: string[];
    // If this matches user interest, mention it!
    matchesUserInterest?: string;
  };

  // FOLLOW-UP: What VIC can offer after the main response
  followUp: {
    // Related topics to suggest
    topics: Array<{
      name: string;
      type: string;
      teaser: string; // Short hook to entice
      matchesInterest?: boolean;
    }>;
    // Suggested question VIC can ask
    suggestedQuestion: string;
  };

  // CONTEXT: Additional info for richer responses
  context: {
    relationships: string[];
    allEntities: string[];
  };

  // META: Performance info
  meta: {
    searchTimeMs: number;
    cacheHits: number;
    cacheMisses: number;
    interestMatches: number;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let cacheHits = 0;
  let cacheMisses = 0;

  try {
    const body = await request.json();
    const { query, userId, userInterests = [], limit = 3 } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Normalize interests for matching
    const normalizedInterests = userInterests.map((i: string) =>
      i.toLowerCase().trim()
    );

    // STEP 1: Discover entities via Zep (fast - no embedding needed)
    const zepDiscovery = await discoverEntitiesFromZep(query);

    // STEP 2: Get primary entity content FAST (this is what VIC speaks first)
    const primaryEntity = zepDiscovery.entities[0];
    let primaryWithContent: EntityWithContent | null = null;

    if (primaryEntity) {
      const articles = await searchPgvectorForEntity(
        primaryEntity.name,
        2,
        { cacheHits, cacheMisses }
      );
      cacheHits = articles.cacheStats.hits;
      cacheMisses = articles.cacheStats.misses;

      // Check if primary matches user interests
      const interestMatch = findInterestMatch(primaryEntity.name, normalizedInterests);

      primaryWithContent = {
        ...primaryEntity,
        interestMatch: !!interestMatch,
        articles: articles.results,
        relatedFacts: zepDiscovery.facts.filter((f) =>
          f.toLowerCase().includes(primaryEntity.name.toLowerCase())
        ),
      };
    }

    // STEP 3: Get connected entities (for follow-ups) - can be slightly slower
    const connectedEntities = zepDiscovery.entities.slice(1, 5);
    const followUpTopics: SequentialSearchResponse["followUp"]["topics"] = [];

    for (const entity of connectedEntities) {
      const interestMatch = findInterestMatch(entity.name, normalizedInterests);

      // If it matches an interest, prioritize it
      followUpTopics.push({
        name: entity.name,
        type: entity.type,
        teaser: entity.summary.substring(0, 100) || `Discover more about ${entity.name}`,
        matchesInterest: !!interestMatch,
      });
    }

    // Sort follow-ups: interest matches first
    followUpTopics.sort((a, b) => {
      if (a.matchesInterest && !b.matchesInterest) return -1;
      if (!a.matchesInterest && b.matchesInterest) return 1;
      return 0;
    });

    // STEP 4: Find the best follow-up question
    const suggestedQuestion = buildSuggestedQuestion(
      followUpTopics,
      normalizedInterests
    );

    // STEP 5: Check if primary matches any user interest
    const primaryInterestMatch = primaryWithContent?.interestMatch
      ? findInterestMatch(primaryWithContent.name, normalizedInterests)
      : null;

    // Count interest matches
    const interestMatches = [
      primaryWithContent?.interestMatch,
      ...followUpTopics.map((t) => t.matchesInterest),
    ].filter(Boolean).length;

    const response: SequentialSearchResponse = {
      query,

      immediate: {
        topic: primaryWithContent,
        keyFacts: zepDiscovery.facts.slice(0, 3),
        matchesUserInterest: primaryInterestMatch || undefined,
      },

      followUp: {
        topics: followUpTopics.slice(0, 4),
        suggestedQuestion,
      },

      context: {
        relationships: zepDiscovery.facts,
        allEntities: zepDiscovery.entities.map((e) => e.name),
      },

      meta: {
        searchTimeMs: Date.now() - startTime,
        cacheHits,
        cacheMisses,
        interestMatches,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Sequential Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Check if a topic matches any user interest
 */
function findInterestMatch(
  topic: string,
  interests: string[]
): string | null {
  const topicLower = topic.toLowerCase();

  for (const interest of interests) {
    // Direct match
    if (topicLower.includes(interest) || interest.includes(topicLower)) {
      return interest;
    }

    // Era matching
    const eraMap: Record<string, string[]> = {
      victorian: ["victorian", "19th century", "1800s"],
      tudor: ["tudor", "16th century", "henry viii", "elizabeth i"],
      medieval: ["medieval", "middle ages", "norman"],
      roman: ["roman", "londinium", "ancient"],
      shakespeare: ["shakespeare", "elizabethan", "globe", "theatre"],
    };

    for (const [era, keywords] of Object.entries(eraMap)) {
      if (
        keywords.some((k) => topicLower.includes(k)) &&
        keywords.some((k) => interest.includes(k))
      ) {
        return interest;
      }
    }
  }

  return null;
}

/**
 * Build a natural follow-up question based on available topics
 */
function buildSuggestedQuestion(
  topics: SequentialSearchResponse["followUp"]["topics"],
  interests: string[]
): string {
  // Prioritize interest-matching topics
  const interestTopic = topics.find((t) => t.matchesInterest);
  if (interestTopic) {
    return `Since you're interested in ${interestTopic.type.toLowerCase()}s, would you like to hear about ${interestTopic.name}?`;
  }

  // Otherwise, pick the most interesting-sounding topic
  if (topics.length >= 2) {
    return `Would you like to hear about ${topics[0].name}, or perhaps ${topics[1].name}?`;
  }

  if (topics.length === 1) {
    return `Shall I tell you about ${topics[0].name}?`;
  }

  return "What else would you like to explore?";
}

/**
 * Discover entities from Zep knowledge graph
 */
async function discoverEntitiesFromZep(
  query: string
): Promise<{ entities: DiscoveredEntity[]; facts: string[] }> {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    return { entities: [], facts: [] };
  }

  try {
    const client = new ZepClient({ apiKey });

    const [nodeResults, edgeResults] = await Promise.all([
      client.graph.search({
        graphId: LOST_LONDON_GRAPH_ID,
        query,
        limit: 8,
        scope: "nodes",
        reranker: "rrf",
      }),
      client.graph.search({
        graphId: LOST_LONDON_GRAPH_ID,
        query,
        limit: 6,
        scope: "edges",
        reranker: "rrf",
      }),
    ]);

    const entities: DiscoveredEntity[] = (nodeResults.nodes || []).map(
      (node, index) => ({
        name: node.name || "Unknown",
        type: node.labels?.find((l) => l !== "Entity") || "Entity",
        summary: node.summary || "",
        relevanceScore: 1 - index * 0.1,
      })
    );

    const facts: string[] = (edgeResults.edges || [])
      .map((edge) => edge.fact)
      .filter((f): f is string => Boolean(f));

    // Also extract entity names from edges (using any to handle Zep's edge structure)
    for (const edge of edgeResults.edges || []) {
      const edgeAny = edge as any;
      const sourceName = edgeAny.source_node_name || edgeAny.sourceNodeName;
      if (sourceName) {
        const exists = entities.some(
          (e) => e.name.toLowerCase() === sourceName?.toLowerCase()
        );
        if (!exists) {
          entities.push({
            name: sourceName,
            type: "Entity",
            summary: `Connected via: ${edge.fact || "relationship"}`,
            relevanceScore: 0.5,
          });
        }
      }
    }

    return { entities, facts };
  } catch (error) {
    console.error("[Zep Discovery] Error:", error);
    return { entities: [], facts: [] };
  }
}

/**
 * Search pgvector with embedding cache
 */
async function searchPgvectorForEntity(
  entityName: string,
  limit: number,
  cacheStats: { cacheHits: number; cacheMisses: number }
): Promise<{
  results: ArticleResult[];
  cacheStats: { hits: number; misses: number };
}> {
  try {
    // Check cache first
    let embedding = await getCachedEmbedding(entityName);

    if (embedding) {
      cacheStats.cacheHits++;
    } else {
      // Generate and cache
      embedding = await getQueryEmbedding(entityName);
      await cacheEmbedding(entityName, embedding);
      cacheStats.cacheMisses++;
    }

    const results = await sql`
      SELECT
        id,
        source_type,
        title,
        content,
        metadata,
        1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
      FROM knowledge_chunks
      WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.3
      ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
      LIMIT ${limit}
    `;

    return {
      results: results.map((r: any) => ({
        id: r.id,
        title: r.title,
        content: r.content.substring(0, 2000),
        excerpt:
          r.content.substring(0, 400) + (r.content.length > 400 ? "..." : ""),
        source_type: r.source_type,
        similarity: parseFloat(r.similarity),
        slug: r.metadata?.slug,
        url: r.metadata?.slug ? `/article/${r.metadata.slug}` : undefined,
      })),
      cacheStats: { hits: cacheStats.cacheHits, misses: cacheStats.cacheMisses },
    };
  } catch (error) {
    console.error(`[pgvector] Error searching for "${entityName}":`, error);
    return {
      results: [],
      cacheStats: { hits: cacheStats.cacheHits, misses: cacheStats.cacheMisses },
    };
  }
}

/**
 * Get cached embedding
 */
async function getCachedEmbedding(query: string): Promise<number[] | null> {
  try {
    const result = await sql`
      UPDATE embedding_cache
      SET hit_count = hit_count + 1, last_used = NOW()
      WHERE query_text = ${query.toLowerCase().trim()}
      RETURNING embedding
    `;

    if (result.length > 0) {
      // Parse the vector string back to array
      const embeddingStr = result[0].embedding;
      if (typeof embeddingStr === "string") {
        return JSON.parse(embeddingStr.replace("[", "[").replace("]", "]"));
      }
      return embeddingStr as number[];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Cache an embedding
 */
async function cacheEmbedding(query: string, embedding: number[]): Promise<void> {
  try {
    await sql`
      INSERT INTO embedding_cache (query_text, embedding)
      VALUES (${query.toLowerCase().trim()}, ${JSON.stringify(embedding)}::vector)
      ON CONFLICT (query_text) DO UPDATE SET
        hit_count = embedding_cache.hit_count + 1,
        last_used = NOW()
    `;
  } catch (error) {
    // Cache failures are non-critical
    console.error("[Cache] Write error:", error);
  }
}

/**
 * Get embedding from Voyage AI
 */
async function getQueryEmbedding(text: string): Promise<number[]> {
  if (!VOYAGE_API_KEY) {
    throw new Error("VOYAGE_API_KEY not configured");
  }

  const response = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${VOYAGE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: [text],
      model: "voyage-2",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// GET handler for testing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || searchParams.get("query");
  const interests = searchParams.get("interests")?.split(",") || [];

  if (!query) {
    return NextResponse.json({ error: 'Query "q" required' }, { status: 400 });
  }

  const mockRequest = {
    json: async () => ({ query, userInterests: interests }),
  } as NextRequest;

  return POST(mockRequest);
}
