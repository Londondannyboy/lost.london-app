/**
 * Slow ingestion script for Zep Free Plan
 * Uses 3-second delays to respect rate limits
 *
 * Run with: npx tsx scripts/ingest-to-zep-slow.ts
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { neon } from "@neondatabase/serverless";
import { ZepClient } from "@getzep/zep-cloud";
import { LOST_LONDON_GRAPH_ID } from "../lib/zep";

const sql = neon(process.env.DATABASE_URL!);
const zepClient = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

interface Article {
  id: number;
  title: string;
  slug: string;
  content: string;
  author: string;
  borough?: string;
  historical_era?: string;
}

// Longer delay for free plan
async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchArticles(limit: number = 10, offset: number = 0): Promise<Article[]> {
  const articles = await sql`
    SELECT id, title, slug, content, author, borough, historical_era
    FROM articles
    WHERE content IS NOT NULL AND content != ''
    ORDER BY id
    LIMIT ${limit} OFFSET ${offset}
  `;
  return articles as Article[];
}

async function ingestArticle(article: Article): Promise<boolean> {
  // Truncate content to 8000 chars (leave room for metadata, limit is 10000)
  const truncatedContent = article.content.substring(0, 8000);

  let text = `Title: ${article.title}\n`;
  text += `Author: ${article.author || "Vic Keegan"}\n`;
  if (article.borough) text += `Borough: ${article.borough}\n`;
  if (article.historical_era) text += `Era: ${article.historical_era}\n`;
  text += `\n${truncatedContent}`;

  try {
    await zepClient.graph.add({
      graphId: LOST_LONDON_GRAPH_ID,
      type: "text",
      data: text,
    });
    return true;
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes("429") || errMsg.includes("Rate limit")) {
      console.log("    Rate limited - waiting 10 seconds...");
      await sleep(10000);
      // Retry once
      try {
        await zepClient.graph.add({
          graphId: LOST_LONDON_GRAPH_ID,
          type: "text",
          data: text,
        });
        return true;
      } catch {
        return false;
      }
    }
    if (errMsg.includes("403") || errMsg.includes("usage limit")) {
      console.log("\n⚠️  Hit episode usage limit - free tier quota exceeded");
      console.log("    Try again tomorrow or upgrade your Zep plan");
      return false;
    }
    console.log(`    Error: ${errMsg.substring(0, 100)}`);
    return false;
  }
}

async function main() {
  console.log("=== Zep Slow Ingestion (Free Plan) ===\n");
  console.log("Using 3-second delays between requests\n");

  // Start with a small batch to test
  const batchSize = 20;
  const startOffset = 0;

  console.log(`Fetching ${batchSize} articles starting at offset ${startOffset}...`);
  const articles = await fetchArticles(batchSize, startOffset);
  console.log(`Found ${articles.length} articles\n`);

  let successCount = 0;
  let failCount = 0;
  let hitLimit = false;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    process.stdout.write(`[${i + 1}/${articles.length}] ${article.title.substring(0, 40)}... `);

    const success = await ingestArticle(article);

    if (success) {
      console.log("✓");
      successCount++;
    } else {
      console.log("✗");
      failCount++;

      // Check if we hit the usage limit
      if (failCount >= 3) {
        console.log("\nMultiple failures - checking if quota exceeded...");
        hitLimit = true;
        break;
      }
    }

    // 3-second delay between requests
    if (i < articles.length - 1) {
      await sleep(3000);
    }
  }

  console.log("\n=== Results ===");
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failCount}`);

  if (hitLimit) {
    console.log("\n⚠️  Quota may be exceeded. Try:");
    console.log("   1. Wait until tomorrow (quota resets daily)");
    console.log("   2. Upgrade Zep plan at https://app.getzep.com/");
  } else if (successCount > 0) {
    console.log(`\n✓ Next batch: npx tsx scripts/ingest-to-zep-slow.ts`);
    console.log(`  Update startOffset to ${startOffset + batchSize} in the script`);
  }
}

main().catch(console.error);
