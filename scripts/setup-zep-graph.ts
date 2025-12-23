/**
 * Setup script for Zep Lost London knowledge graph
 *
 * Run with: npx tsx scripts/setup-zep-graph.ts
 *
 * This script:
 * 1. Creates the "lost-london" graph if it doesn't exist
 * 2. Applies the London History ontology (entity types and edge types)
 */

import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { ZepClient } from "@getzep/zep-cloud";
import { LOST_LONDON_GRAPH_ID } from "../lib/zep";
import { applyOntology } from "../lib/zep-ontology";

async function main() {
  console.log("=== Zep Lost London Graph Setup ===\n");

  const apiKey = process.env.ZEP_API_KEY;

  // Verify API key is set
  if (!apiKey) {
    console.error("ERROR: ZEP_API_KEY not found in environment");
    process.exit(1);
  }
  console.log("ZEP_API_KEY found");

  const client = new ZepClient({ apiKey });

  // Step 1: Create graph
  console.log(`\n1. Creating graph '${LOST_LONDON_GRAPH_ID}'...`);
  try {
    try {
      await client.graph.get(LOST_LONDON_GRAPH_ID);
      console.log(`   Graph '${LOST_LONDON_GRAPH_ID}' already exists`);
    } catch {
      await client.graph.create({ graphId: LOST_LONDON_GRAPH_ID });
      console.log(`   Created graph '${LOST_LONDON_GRAPH_ID}'`);
    }
  } catch (error) {
    console.error("   Failed to create graph:", error);
    process.exit(1);
  }

  // Step 2: Apply ontology
  console.log("\n2. Applying London History ontology...");
  try {
    await applyOntology(apiKey);
    console.log("   Ontology applied");
  } catch (error) {
    console.error("   Failed to apply ontology:", error);
    process.exit(1);
  }

  console.log("\n=== Setup Complete ===");
  console.log(`\nNext step: Run 'npx tsx scripts/ingest-to-zep.ts' to load articles`);
}

main().catch(console.error);
