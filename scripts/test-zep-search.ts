/**
 * Test Zep search to see what entities were extracted
 */
import * as dotenv from "dotenv";
import { resolve } from "path";
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { ZepClient } from "@getzep/zep-cloud";

const client = new ZepClient({ apiKey: process.env.ZEP_API_KEY! });

async function searchGraph() {
  const query = process.argv[2] || "Royal Aquarium";

  console.log(`\n=== Searching for: "${query}" ===\n`);

  // Search for entities (nodes)
  console.log("--- NODES (Entities) ---");
  const nodeResults = await client.graph.search({
    graphId: "lost-london",
    query,
    limit: 10,
    scope: "nodes",
  });

  if (nodeResults.nodes && nodeResults.nodes.length > 0) {
    for (const node of nodeResults.nodes) {
      console.log(`\n• ${node.name}`);
      console.log(`  Type: ${node.labels?.join(", ") || "unknown"}`);
      if (node.summary) console.log(`  Summary: ${node.summary.substring(0, 150)}...`);
    }
  } else {
    console.log("  No nodes found");
  }

  // Search for facts (edges)
  console.log("\n--- EDGES (Facts) ---");
  const edgeResults = await client.graph.search({
    graphId: "lost-london",
    query,
    limit: 5,
    scope: "edges",
  });

  if (edgeResults.edges && edgeResults.edges.length > 0) {
    for (const edge of edgeResults.edges.slice(0, 5)) {
      console.log(`\n• ${edge.fact}`);
    }
  } else {
    console.log("  No edges found");
  }
}

searchGraph().catch(console.error);
