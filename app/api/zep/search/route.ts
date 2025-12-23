/**
 * Zep Knowledge Graph Search API
 *
 * Searches the Lost London knowledge graph for relevant content
 * Returns entities, facts, and relationships from the graph
 */

import { NextRequest, NextResponse } from "next/server";
import { ZepClient } from "@getzep/zep-cloud";

const LOST_LONDON_GRAPH_ID = "lost-london";

export async function POST(request: NextRequest) {
  try {
    const { query, limit = 10, scope = "edges" } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.ZEP_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ZEP_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new ZepClient({ apiKey });

    // Search the knowledge graph
    const results = await client.graph.search({
      graphId: LOST_LONDON_GRAPH_ID,
      query,
      limit,
      scope,
      reranker: "rrf", // Reciprocal Rank Fusion for better results
    });

    // Format results for the frontend
    const formattedResults = {
      query,
      edges: results.edges || [],
      nodes: results.nodes || [],
      count: (results.edges?.length || 0) + (results.nodes?.length || 0),
    };

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("[Zep Search] Error:", error);
    return NextResponse.json(
      { error: "Search failed", details: String(error) },
      { status: 500 }
    );
  }
}
