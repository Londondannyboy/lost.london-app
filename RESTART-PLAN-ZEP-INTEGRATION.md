# VIC Lost.London - Zep Integration Restart Plan

**Created:** December 23, 2024
**Purpose:** Complete context for continuing Zep + pgvector + Supermemory integration

---

## 1. Project Overview

**VIC** is a voice-based AI guide to London history powered by:
- **372 articles** by Vic Keegan
- **81 Thorney Island book chapters**
- **Hume AI** voice interface

**Website:** lost.london
**GitHub:** https://github.com/Londondannyboy/lost.london

---

## 2. The Three Systems & What They Do

### Understanding: What Each System Is Good At

| System | Strength | Weakness |
|--------|----------|----------|
| **pgvector** | Full rich article content (500+ words), semantic search | No entity relationships, no memory |
| **Zep Graph** | Entity relationships (Royal Aquarium → Westminster → Arthur Sullivan), auto-extracts facts | Only has extracted summaries, not full articles |
| **Supermemory** | Persistent user memory for anonymous users, simple API | Requires explicit tool calls to remember |
| **Zep Memory** | Automatic fact extraction from conversations | Part of Zep, shares rate limits |

### The Key Insight

**Zep Graph knows WHAT things are related, pgvector has the RICH CONTENT.**

- Zep: "Royal Aquarium is a Building in Westminster, connected to Arthur Sullivan"
- pgvector: "The Royal Aquarium opened in 1876 with a 400-piece orchestra conducted by Arthur Sullivan. It was nearly as big as Crystal Palace..." (full 500-word article)

---

## 3. Current Architecture (What's Built)

```
┌─────────────────────────────────────────────────────────────┐
│                      HUME AI (Voice)                        │
│            Config: 05e280de-8f00-4505-81e2-b25662a69a8d     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    VoiceWidget.tsx                          │
│         (System prompt, tool handling, memory)              │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   SUPERMEMORY   │  │   ZEP CLOUD     │  │  NEON POSTGRES  │
│  (User Memory)  │  │ (Graph+Memory)  │  │   (pgvector)    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • remember_user │  │ • 452 episodes  │  │ • 616 chunks    │
│   tool saves    │  │   ingested      │  │   embedded      │
│   name/interests│  │ • Auto extracts │  │ • Full article  │
│ • Anonymous IDs │  │   facts         │  │   content       │
│ • Free tier     │  │ • Entity graph  │  │ • Voyage AI     │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

---

## 4. Data Flow: How Search Works Now

### Current: Parallel Search (Hybrid)

```
User: "Tell me about the Royal Aquarium"
                    │
                    ▼
        /api/london-tools/hybrid-search
                    │
    ┌───────────────┴───────────────┐
    │         PARALLEL              │
    ▼                               ▼
pgvector Search                 Zep Graph Search
(/api/london-tools/             (/api/zep/search)
 semantic-search)                    │
    │                               │
    ▼                               ▼
FULL ARTICLE:                   ENTITIES:
"Royal Aquarium opened          • Royal Aquarium (Building)
in 1876, Arthur Sullivan        • Westminster (Place)
conducted 400-piece             • Arthur Sullivan (Person)
orchestra..."                   FACTS:
                                • "Was in Westminster"
                                • "Zazel performed there"
    │                               │
    └───────────────┬───────────────┘
                    ▼
            Combined Response:
            {
              results: [full articles],
              relatedEntities: [entities],
              relatedFacts: [facts],
              suggestedTopics: ["Westminster", "Arthur Sullivan"]
            }
```

### Alternative: Sequential (Zep-guided) - NOT YET IMPLEMENTED

```
User: "Tell me about Victorian entertainment"
                    │
                    ▼
            Zep Graph Search
            "What entities relate to Victorian entertainment?"
                    │
                    ▼
            ENTITIES FOUND:
            • Royal Aquarium (Building)
            • Crystal Palace (Building)
            • Music Halls (Topic)
            • Lambeth (Place)
                    │
                    ▼
            pgvector Search
            (Search for each entity to get rich content)
                    │
                    ▼
            RICH ARTICLES for each entity
```

**Question for you:** Should Zep guide pgvector, or run in parallel?
- Parallel is faster but might miss connections
- Sequential is smarter but slower

---

## 5. User Memory Flow

### Anonymous User Journey

```
FIRST VISIT:
1. User lands on lost.london
2. localStorage generates: vic_1703345678_abc123def
3. VIC asks: "What should I call you?"
4. User: "I'm Sarah"
5. VIC calls remember_user(memory: "User's name is Sarah", type: "name")
   → Stored in Supermemory
6. Conversation continues...
7. On disconnect:
   → Full conversation → Supermemory
   → Key messages → Zep (auto fact extraction)

RETURN VISIT:
1. User returns (same browser)
2. localStorage has: vic_1703345678_abc123def
3. getUserProfile() queries BOTH:
   - Supermemory: "User's name is Sarah, interested in Tudor history"
   - Zep: [any facts extracted from previous conversations]
4. VIC greets: "Welcome back, Sarah! Last time we talked about Tudor history..."
```

### Why Both Supermemory AND Zep?

| Supermemory | Zep Memory |
|-------------|------------|
| Explicit saves via tool | Automatic extraction |
| Simple key-value style | Graph-based relationships |
| Free tier generous | Paid for volume |
| Good for: name, interests | Good for: conversation context |

---

## 6. Files Created/Modified

### New Files
```
lib/zep.ts                           # Zep client, graph helpers
lib/zep-ontology.ts                  # 9 entity types, 10 edge types
lib/zep-memory.ts                    # Zep-only memory (deprecated by hybrid)
lib/hybrid-memory.ts                 # Combined Supermemory + Zep memory
app/api/zep/search/route.ts          # Zep graph search API
app/api/zep/user/route.ts            # Zep user memory API
app/api/london-tools/hybrid-search/route.ts  # Combined pgvector + Zep
scripts/setup-zep-graph.ts           # Create graph, apply ontology
scripts/ingest-to-zep.ts             # Load 452 episodes into Zep
```

### Modified Files
```
components/VoiceWidget.tsx           # Uses hybrid-memory, hybrid-search
package.json                         # Added @getzep/zep-cloud
.env.local                           # Added ZEP_API_KEY
```

### Existing Files (Still Used)
```
lib/supermemory.ts                   # Original Supermemory client
lib/db.ts                            # Neon database queries
app/api/memory/profile/route.ts      # Supermemory profile
app/api/memory/remember/route.ts     # Supermemory explicit save
app/api/memory/conversation/route.ts # Supermemory conversation save
app/api/london-tools/semantic-search/route.ts  # pgvector search
```

---

## 7. Environment Variables

```bash
# Hume AI (Voice)
NEXT_PUBLIC_HUME_API_KEY=gzwF7lPBfIshOhve04HLNPs5RluArU7oXQZaqnqYKi6KKQef
HUME_SECRET_KEY=cN0BYa70A0I6jAkO8Alt8VHaRzdIRVJahWFHaLza7cGfq2tAvuzAGeEmRDGURA3i
NEXT_PUBLIC_HUME_CONFIG_ID=05e280de-8f00-4505-81e2-b25662a69a8d

# Neon PostgreSQL (Articles + pgvector)
DATABASE_URL=postgresql://neondb_owner:npg_0HmvsELjo8Gr@ep-ancient-violet-abx9ybhn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require

# Zep Cloud (Knowledge Graph + Memory)
ZEP_API_KEY=z_1dWlkIjoiMmNkYWVjZjktYTU5Ny00ZDlkLWIyMWItNTZjOWI5OTE5MTE4In0.Ssyb_PezcGgacQFq6Slg3fyFoqs8hBhvp6WsE8rO4VK_D70CT5tqDbFOs6ZTf8rw7qYfTRhLz5YFm8RR854rHg

# Supermemory (User Memory - explicit saves)
SUPERMEMORY_API_KEY=sm_7VP4bvFs2SXP22CMf96mpP_SxAlsdgHoeaKikYZerSANQJnXJXxGEJyWpzuooZltcdfUBdbWMLURiiOdcJmQlNt

# Voyage AI (Embeddings for pgvector)
VOYAGE_API_KEY=pa-NBONsUWEcXy-DPKM4J_Jtq82H6BPCDauNBq-zl0ViB0
```

**CRITICAL:** Add ZEP_API_KEY to Vercel environment variables!

---

## 8. Zep Graph Details

### Graph ID
```
lost-london
```

### Data Ingested
- **371 articles** ✓
- **81 Thorney Island chapters** ✓
- **Total: 452 episodes**

### Ontology (Custom Entity Types)
```
ENTITIES (9):
- Person: Historical figures (Shakespeare, Arthur Sullivan)
- Place: Geographic locations (Westminster, Bankside)
- Building: Structures (Royal Aquarium, Globe Theatre)
- River: Waterways (Tyburn, Fleet, Thames)
- Era: Time periods (Roman, Medieval, Tudor, Victorian)
- Event: Historical events (Great Fire, coronations)
- Article: Vic's articles
- Topic: Themes (hidden rivers, lost theatres)
- Visitor: Users of VIC

EDGES (10):
- LOCATED_IN: Building/Place in Place
- OCCURRED_DURING: Event/Building in Era
- WROTE_ABOUT: Article covers Topic/Place/Person
- FLOWS_THROUGH: River through Place
- ASSOCIATED_WITH: Person with Place/Building/Event
- INTERESTED_IN: Visitor interested in Topic/Era
- PART_OF: Place/Building part of Place
- DESTROYED_IN: Building destroyed in Event
- CONTEMPORARY_OF: Person contemporary of Person
- RELATED_TO: Topic related to Topic
```

### Verified Working
```bash
# Test search
npx tsx scripts/test-zep-search.ts "Royal Aquarium"

# Results show:
# - Royal Aquarium (Building) with summary
# - Related: Westminster, Arthur Sullivan, Crystal Palace
# - Facts: "Was in Westminster", "Zazel performed there"
```

---

## 9. What's Working ✓

1. **Zep Graph Created** - "lost-london" with 452 episodes
2. **Ontology Applied** - 9 entity types, 10 edge types
3. **Hybrid Search API** - `/api/london-tools/hybrid-search`
4. **Combined Memory** - Supermemory + Zep in `lib/hybrid-memory.ts`
5. **VoiceWidget Updated** - Uses hybrid search, remember_user tool
6. **Build Passes** - TypeScript compiles
7. **Pushed to GitHub** - Auto-deploys to Vercel

---

## 10. Open Questions / TODO

### Deployment
- [ ] Verify ZEP_API_KEY is in Vercel env vars
- [ ] Test on production after deploy

### Architecture Questions
- [ ] **Parallel vs Sequential?** Should Zep guide pgvector search, or run both simultaneously?
- [ ] **Zep for follow-ups?** Use `suggestedTopics` from Zep to offer related topics?

### Enhancements
- [ ] **Smarter hybrid search** - Weight pgvector results by Zep entity relevance?
- [ ] **Graph visualization** - Show entity connections in UI?
- [ ] **Memory dashboard** - Let users see what VIC remembers about them?

### Technical Debt
- [ ] Remove `lib/zep-memory.ts` (replaced by `hybrid-memory.ts`)
- [ ] Clean up test scripts in `/scripts/`
- [ ] Add error handling for Zep rate limits

---

## 11. Quick Reference Commands

```bash
# Development
cd /Users/dankeegan/lost.london
npm run dev

# Test Zep search
npx tsx scripts/test-zep-search.ts "Royal Aquarium"
npx tsx scripts/test-zep-search.ts "Shakespeare"
npx tsx scripts/test-zep-search.ts "Thorney Island"

# Re-run Zep setup (if needed)
npx tsx scripts/setup-zep-graph.ts

# Re-ingest to Zep (if needed)
npx tsx scripts/ingest-to-zep.ts

# Build and deploy
npm run build
git add -A && git commit -m "message" && git push
```

---

## 12. The Big Picture

```
┌────────────────────────────────────────────────────────────────┐
│                        USER EXPERIENCE                         │
├────────────────────────────────────────────────────────────────┤
│  "Hi VIC, tell me about the Royal Aquarium"                    │
│                                                                │
│  VIC responds with:                                            │
│  • RICH DETAIL from pgvector articles                          │
│  • SMART CONNECTIONS from Zep graph                            │
│  • REMEMBERS YOUR NAME via Supermemory                         │
│  • LEARNS YOUR INTERESTS automatically via Zep                 │
│                                                                │
│  "The Royal Aquarium opened in 1876, right next to Parliament  │
│   Square. Arthur Sullivan conducted its 400-piece orchestra!   │
│   Would you like to hear about the Crystal Palace, Sarah?      │
│   It was another Victorian entertainment wonder..."            │
└────────────────────────────────────────────────────────────────┘
```

---

## 13. Key Files to Read First

When continuing this work:

1. **`lib/hybrid-memory.ts`** - Unified memory system
2. **`app/api/london-tools/hybrid-search/route.ts`** - Combined search
3. **`components/VoiceWidget.tsx`** - Main integration point
4. **`lib/zep-ontology.ts`** - Graph schema

---

## 14. Contact / Resources

- **Zep Docs:** https://help.getzep.com/
- **Zep Dashboard:** https://app.getzep.com/
- **Hume Dashboard:** https://platform.hume.ai/
- **Neon Dashboard:** https://console.neon.tech/
- **Vercel Dashboard:** https://vercel.com/

---

*Last updated: December 23, 2024*
