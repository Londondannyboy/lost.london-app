/**
 * Ingest articles and Thorney Island content into Zep knowledge graph
 *
 * Run with: npx tsx scripts/ingest-to-zep.ts
 *
 * This script:
 * 1. Exports all 372 articles from Neon
 * 2. Exports all Thorney Island chapters from Neon
 * 3. Ingests each piece of content into the Zep knowledge graph
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { neon } from "@neondatabase/serverless";
import { ZepClient } from "@getzep/zep-cloud";
import { LOST_LONDON_GRAPH_ID } from "../lib/zep";

// Create database connection
const sql = neon(process.env.DATABASE_URL!);

// Create Zep client
const zepClient = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: string;
  borough?: string;
  historical_era?: string;
  latitude?: number;
  longitude?: number;
  publication_date?: string;
}

interface ThorneyChunk {
  chunk_number: number;
  content: string;
}

// Rate limiting helper
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArticles(): Promise<Article[]> {
  console.log("Fetching articles from Neon...");
  const articles = await sql`
    SELECT id, title, slug, content, author, borough, historical_era,
           latitude, longitude, publication_date
    FROM articles
    WHERE content IS NOT NULL AND content != ''
    ORDER BY id
  `;
  console.log(`  Found ${articles.length} articles`);
  return articles as Article[];
}

async function fetchThorneyIsland(): Promise<ThorneyChunk[]> {
  console.log("Fetching Thorney Island content from Neon...");
  try {
    const chunks = await sql`
      SELECT chunk_number, content
      FROM thorney_island_knowledge
      WHERE content IS NOT NULL AND content != ''
      ORDER BY chunk_number
    `;
    console.log(`  Found ${chunks.length} Thorney Island chunks`);
    return chunks as ThorneyChunk[];
  } catch (error) {
    console.log("  Thorney Island table not found or empty");
    return [];
  }
}

async function ingestArticle(article: Article, index: number, total: number) {
  // Format article with metadata
  let text = `Title: ${article.title}\n`;
  text += `Author: ${article.author || "Vic Keegan"}\n`;

  if (article.borough) {
    text += `Borough: ${article.borough}\n`;
  }
  if (article.historical_era) {
    text += `Era: ${article.historical_era}\n`;
  }
  if (article.latitude && article.longitude) {
    text += `Location: ${article.latitude}, ${article.longitude}\n`;
  }

  text += `\n${article.content}`;

  try {
    await zepClient.graph.add({
      graphId: LOST_LONDON_GRAPH_ID,
      type: "text",
      data: text,
    });
    console.log(`  [${index + 1}/${total}] ✓ ${article.title.substring(0, 50)}...`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`  [${index + 1}/${total}] ✗ ${article.title.substring(0, 50)}... - ${errMsg}`);
  }
}

async function ingestThorneyChunk(chunk: ThorneyChunk, index: number, total: number) {
  const text = `Source: Thorney Island Book\nChapter: ${chunk.chunk_number}\n\n${chunk.content}`;

  try {
    await zepClient.graph.add({
      graphId: LOST_LONDON_GRAPH_ID,
      type: "text",
      data: text,
    });
    console.log(`  [${index + 1}/${total}] ✓ Thorney Island Chapter ${chunk.chunk_number}`);
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.log(`  [${index + 1}/${total}] ✗ Chapter ${chunk.chunk_number} - ${errMsg}`);
  }
}

async function main() {
  console.log("=== Zep Lost London Content Ingestion ===\n");

  // Verify environment
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL not found");
    process.exit(1);
  }
  if (!process.env.ZEP_API_KEY) {
    console.error("ERROR: ZEP_API_KEY not found");
    process.exit(1);
  }

  // Fetch content from Neon
  const articles = await fetchArticles();
  const thorneyChunks = await fetchThorneyIsland();

  const totalItems = articles.length + thorneyChunks.length;
  console.log(`\nTotal items to ingest: ${totalItems}`);

  // Ingest articles
  console.log("\n--- Ingesting Articles ---");
  for (let i = 0; i < articles.length; i++) {
    await ingestArticle(articles[i], i, articles.length);
    // Rate limit: 1 request per 200ms to avoid hitting limits
    await sleep(200);
  }

  // Ingest Thorney Island
  if (thorneyChunks.length > 0) {
    console.log("\n--- Ingesting Thorney Island ---");
    for (let i = 0; i < thorneyChunks.length; i++) {
      await ingestThorneyChunk(thorneyChunks[i], i, thorneyChunks.length);
      await sleep(200);
    }
  }

  console.log("\n=== Ingestion Complete ===");
  console.log(`\nIngested:`);
  console.log(`  - ${articles.length} articles`);
  console.log(`  - ${thorneyChunks.length} Thorney Island chapters`);
  console.log(`\nGraph ID: ${LOST_LONDON_GRAPH_ID}`);
}

main().catch(console.error);
