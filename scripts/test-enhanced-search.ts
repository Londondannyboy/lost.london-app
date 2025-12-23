/**
 * Test Enhanced Sequential Search with Interest Weighting
 * Run with: npx tsx scripts/test-enhanced-search.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const BASE_URL = "http://localhost:3000";

async function testSearch(query: string, interests: string[] = []) {
  console.log("\n" + "═".repeat(60));
  console.log(`Query: "${query}"`);
  console.log(`User interests: ${interests.length > 0 ? interests.join(", ") : "(none)"}`);
  console.log("═".repeat(60));

  const startTime = Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/london-tools/sequential-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        userInterests: interests,
      }),
    });

    const result = await response.json();

    // IMMEDIATE section
    console.log("\n📣 SPEAK NOW (immediate response):");
    if (result.immediate?.topic) {
      console.log(`   Topic: ${result.immediate.topic.name} (${result.immediate.topic.type})`);
      console.log(`   Article: ${result.immediate.topic.articles?.[0]?.title || "none"}`);
      if (result.immediate.matchesUserInterest) {
        console.log(`   🎯 MATCHES INTEREST: "${result.immediate.matchesUserInterest}"`);
      }
    } else {
      console.log("   (no primary topic found)");
    }

    console.log(`\n   Key facts:`);
    (result.immediate?.keyFacts || []).slice(0, 3).forEach((f: string, i: number) => {
      console.log(`   ${i + 1}. ${f.substring(0, 80)}...`);
    });

    // FOLLOW-UP section
    console.log("\n🎤 OFFER AFTER (follow-up):");
    console.log(`   Suggested question: "${result.followUp?.suggestedQuestion}"`);
    console.log(`\n   Follow-up topics:`);
    (result.followUp?.topics || []).forEach((t: any, i: number) => {
      const interestFlag = t.matchesInterest ? " 🎯" : "";
      console.log(`   ${i + 1}. ${t.name} (${t.type})${interestFlag}`);
    });

    // META
    console.log("\n📊 Performance:");
    console.log(`   Time: ${result.meta?.searchTimeMs}ms`);
    console.log(`   Cache hits: ${result.meta?.cacheHits}, misses: ${result.meta?.cacheMisses}`);
    console.log(`   Interest matches: ${result.meta?.interestMatches}`);

  } catch (error) {
    console.error("Error:", error);
  }
}

async function main() {
  console.log("Testing Enhanced Sequential Search v2\n");
  console.log("Make sure `npm run dev` is running!\n");

  // Test 1: No interests
  await testSearch("Royal Aquarium");

  // Test 2: With Victorian interest
  await testSearch("Royal Aquarium", ["victorian"]);

  // Test 3: With Shakespeare interest
  await testSearch("Globe Theatre", ["shakespeare", "elizabethan"]);

  // Test 4: Cache test - run same query again
  console.log("\n\n🔄 CACHE TEST - Running same query again...");
  await testSearch("Royal Aquarium", ["victorian"]);
}

main();
