/**
 * Test script for Sequential Search API
 * Run with: npx tsx scripts/test-sequential-search.ts "query"
 */

import { neon } from "@neondatabase/serverless";
import { ZepClient } from "@getzep/zep-cloud";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const LOST_LONDON_GRAPH_ID = "lost-london";
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;

interface DiscoveredEntity {
  name: string;
  type: string;
  summary: string;
  relevanceScore: number;
}

async function getQueryEmbedding(text: string): Promise<number[]> {
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

  const data = await response.json();
  return data.data[0].embedding;
}

async function discoverEntitiesFromZep(query: string) {
  const apiKey = process.env.ZEP_API_KEY;
  if (!apiKey) {
    console.log("No ZEP_API_KEY found");
    return { entities: [], facts: [] };
  }

  const client = new ZepClient({ apiKey });

  console.log("\n🔍 STEP 1: Querying Zep for entities...");

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

  console.log(`   Found ${entities.length} entities:`);
  entities.forEach((e, i) => {
    console.log(`   ${i + 1}. ${e.name} (${e.type})`);
  });

  console.log(`\n   Found ${facts.length} relationship facts:`);
  facts.forEach((f, i) => {
    console.log(`   ${i + 1}. ${f.substring(0, 80)}...`);
  });

  return { entities, facts };
}

async function searchPgvectorForEntity(entityName: string, limit: number) {
  const embedding = await getQueryEmbedding(entityName);

  const results = await sql`
    SELECT
      id,
      title,
      content,
      source_type,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
    FROM knowledge_chunks
    WHERE 1 - (embedding <=> ${JSON.stringify(embedding)}::vector) > 0.3
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT ${limit}
  `;

  return results.map((r: any) => ({
    id: r.id,
    title: r.title,
    content: r.content.substring(0, 300) + "...",
    source_type: r.source_type,
    similarity: parseFloat(r.similarity),
  }));
}

async function main() {
  const query = process.argv[2] || "Royal Aquarium";

  console.log("═".repeat(60));
  console.log("SEQUENTIAL SEARCH TEST");
  console.log("═".repeat(60));
  console.log(`Query: "${query}"`);

  const startTime = Date.now();

  // STEP 1: Discover entities via Zep
  const { entities, facts } = await discoverEntitiesFromZep(query);

  // STEP 2: For each entity, get rich content from pgvector
  console.log("\n📚 STEP 2: Getting rich content from pgvector for each entity...");

  for (const entity of entities.slice(0, 4)) {
    console.log(`\n   Searching for: "${entity.name}"...`);
    const articles = await searchPgvectorForEntity(entity.name, 2);

    if (articles.length > 0) {
      console.log(`   ✓ Found ${articles.length} article(s):`);
      articles.forEach((a: any) => {
        console.log(`     - "${a.title}" (similarity: ${(a.similarity * 100).toFixed(1)}%)`);
        console.log(`       ${a.content.substring(0, 100)}...`);
      });
    } else {
      console.log(`   ✗ No articles found`);
    }
  }

  // STEP 3: Direct pgvector search for comparison
  console.log("\n📖 STEP 3: Direct pgvector search (for comparison)...");
  const directResults = await searchPgvectorForEntity(query, 3);
  directResults.forEach((a: any) => {
    console.log(`   - "${a.title}" (similarity: ${(a.similarity * 100).toFixed(1)}%)`);
  });

  const elapsed = Date.now() - startTime;

  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));
  console.log(`Total time: ${elapsed}ms`);
  console.log(`Entities discovered: ${entities.length}`);
  console.log(`Relationship facts: ${facts.length}`);
  console.log(`\nSuggested follow-up topics:`);
  entities.slice(1, 4).forEach((e) => {
    console.log(`   → ${e.name}`);
  });
}

main().catch(console.error);
