# VIC Lost.London - ZEP Integration Restart Plan

## Project Overview

**What is this?**
VIC is a voice-based AI guide to London history, powered by Vic Keegan's 372 articles and his Thorney Island book (56 chapters). Users speak to VIC via Hume AI voice interface to explore London's hidden history.

**Website:** lost.london
**GitHub:** https://github.com/Londondannyboy/lost.london
**Tech Stack:** Next.js, Hume AI (voice), Neon (PostgreSQL)

---

## Current Architecture (What Exists)

### Database: Neon PostgreSQL
- **Project:** young-sunset-41213631
- **Endpoint:** ep-ancient-violet-abx9ybhn-pooler.eu-west-2.aws.neon.tech
- **Database:** neondb

### Tables:
```sql
articles                    -- 372 London history articles
thorney_island_knowledge    -- 81 chunks from the book
knowledge_chunks            -- 616 embedded chunks (pgvector)
```

### Current Tools:
| Tool | Purpose | Status |
|------|---------|--------|
| **Neon** | PostgreSQL hosting | ✅ Keep |
| **pgvector** | Semantic search on 616 chunks | ❌ Replace with Zep |
| **Voyage AI** | Embedding generation | ❌ No longer needed |
| **Supermemory** | User memory (names, interests) | ❌ Replace with Zep |
| **Hume AI** | Voice interface | ✅ Keep |

### Environment Variables (Current):
```
NEXT_PUBLIC_HUME_API_KEY=gzwF7lPBfIshOhve04HLNPs5RluArU7oXQZaqnqYKi6KKQef
HUME_SECRET_KEY=cN0BYa70A0I6jAkO8Alt8VHaRzdIRVJahWFHaLza7cGfq2tAvuzAGeEmRDGURA3i
NEXT_PUBLIC_HUME_CONFIG_ID=05e280de-8f00-4505-81e2-b25662a69a8d
DATABASE_URL=postgresql://neondb_owner:npg_0HmvsELjo8Gr@ep-ancient-violet-abx9ybhn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require
VOYAGE_API_KEY=pa-NBONsUWEcXy-DPKM4J_Jtq82H6BPCDauNBq-zl0ViB0
SUPERMEMORY_API_KEY=sm_7VP4bvFs2SXP22CMf96mpP_SxAlsdgHoeaKikYZerSANQJnXJXxGEJyWpzuooZltcdfUBdbWMLURiiOdcJmQlNt
```

---

## What We Investigated

### 1. Data Storage Problem
- Articles and Thorney Island content were in **separate tables**
- AI had to guess which tool to use (often guessed wrong)
- "Royal Aquarium" query might miss results

### 2. Unified Search Solution (pgvector)
- Created `knowledge_chunks` table with vector embeddings
- 616 chunks: 455 from articles, 161 from Thorney Island
- Semantic search via Voyage AI embeddings
- **Works but no relationship awareness**

### 3. User Memory Problem
- VIC couldn't remember returning users
- Added Supermemory integration
- Required explicit `remember_user` tool calls
- **Bug:** Profile retrieval wasn't extracting names properly

### 4. Zep Investigation
- **Zep is superior** for this use case
- Automatic fact extraction (no explicit tool calls)
- Temporal knowledge graph (Graphiti)
- Entity relationships (Shakespeare → Globe → Bankside)
- 94.8% accuracy on Deep Memory Retrieval benchmark

### Key Decision: Replace pgvector + Supermemory with Zep

---

## New Architecture with Zep

```
┌─────────────────────────────────────────────────────────────┐
│                         HUME (Voice)                        │
│                Config: 05e280de-8f00-4505-81e2-b25662a69a8d │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      VIC System Prompt                       │
│              (Updated for Zep - see below)                   │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌──────────────────────────────┐    ┌─────────────────────────┐
│            ZEP               │    │          NEON           │
│   (Graph + Memory + Search)  │    │   (Source of Truth)     │
├──────────────────────────────┤    ├─────────────────────────┤
│ • Knowledge graph            │    │ • articles table        │
│ • User memory (automatic)    │    │ • thorney_island table  │
│ • Fact extraction            │    │ • Backup/raw content    │
│ • Temporal awareness         │    └─────────────────────────┘
│ • Entity relationships       │
│ • Search with graph context  │
└──────────────────────────────┘

REMOVED:
- pgvector (replaced by Zep)
- Voyage AI (not needed)
- Supermemory (replaced by Zep)
- knowledge_chunks table (not needed)
- remember_user tool (automatic in Zep)
```

---

## Zep Ontology for London History

### Entity Types (10 max)

```python
from pydantic import BaseModel, Field

class Person(BaseModel):
    """Historical figures and people mentioned in London history"""
    name: str = Field(description="Full name of the person")
    era: str = Field(description="Time period: Roman, Medieval, Tudor, Stuart, Georgian, Victorian, Modern")
    role: str = Field(description="Their role: monarch, writer, architect, politician, etc.")

class Place(BaseModel):
    """Geographic locations in London"""
    name: str = Field(description="Place name")
    borough: str = Field(description="Modern London borough if applicable")
    exists: bool = Field(description="Whether this place still exists today")

class Building(BaseModel):
    """Structures, monuments, venues in London"""
    name: str = Field(description="Building name")
    built_year: int = Field(description="Year constructed")
    demolished_year: int = Field(description="Year demolished, or null if still standing")
    building_type: str = Field(description="Type: church, theatre, palace, prison, museum, etc.")

class River(BaseModel):
    """Waterways including hidden underground rivers"""
    name: str = Field(description="River name")
    status: str = Field(description="Current status: visible, underground, lost")

class Era(BaseModel):
    """Historical time periods"""
    name: str = Field(description="Era name: Roman, Medieval, Tudor, Stuart, Georgian, Victorian, Modern")
    start_year: int = Field(description="Approximate start year")
    end_year: int = Field(description="Approximate end year")

class Event(BaseModel):
    """Significant historical events"""
    name: str = Field(description="Event name")
    year: int = Field(description="Year it occurred")
    event_type: str = Field(description="Type: fire, war, coronation, construction, demolition, etc.")

class Article(BaseModel):
    """Vic Keegan's written articles"""
    title: str = Field(description="Article title")
    slug: str = Field(description="URL slug for the article")
    category: str = Field(description="Category: Hidden gems, Lost London, etc.")

class Topic(BaseModel):
    """Themes and subject areas"""
    name: str = Field(description="Topic name: hidden rivers, lost theatres, Roman ruins, etc.")

class Visitor(BaseModel):
    """Users who interact with VIC"""
    name: str = Field(description="User's name if known")

class Conversation(BaseModel):
    """Chat sessions with visitors"""
    summary: str = Field(description="Brief summary of what was discussed")
```

### Edge Types (10 max)

```python
class LocatedIn(BaseModel):
    """Building/Place is located in a Place"""
    description: str = Field(description="Spatial relationship - X is located in Y")

class BuiltDuring(BaseModel):
    """Building was constructed during an Era"""
    description: str = Field(description="Temporal relationship - X was built during Y era")

class WroteAbout(BaseModel):
    """Person wrote about a Topic/Place/Building"""
    description: str = Field(description="Authorship - X wrote about Y")

class FlowsThrough(BaseModel):
    """River flows through a Place"""
    description: str = Field(description="Geographic - River X flows through Y")

class AssociatedWith(BaseModel):
    """Person is associated with Place/Building/Event"""
    description: str = Field(description="Historical association - X is associated with Y")

class InterestedIn(BaseModel):
    """Visitor is interested in a Topic/Era/Place"""
    description: str = Field(description="User preference - Visitor X is interested in Y")

class Discussed(BaseModel):
    """Conversation covered a Topic/Building/Person"""
    description: str = Field(description="Conversation content - We discussed Y")

class PartOf(BaseModel):
    """Place/Building is part of larger Place"""
    description: str = Field(description="Hierarchical - X is part of Y")

class DestroyedIn(BaseModel):
    """Building was destroyed in an Event"""
    description: str = Field(description="Destruction - X was destroyed in Y")

class ContemporaryOf(BaseModel):
    """Person lived at same time as another Person"""
    description: str = Field(description="Temporal overlap - X was contemporary of Y")
```

---

## Data Migration Plan

### Step 1: Export from Neon
```sql
-- Export articles
SELECT id, title, slug, content, author, categories, borough, historical_era,
       latitude, longitude, publication_date
FROM articles;

-- Export Thorney Island
SELECT chunk_number, content
FROM thorney_island_knowledge
ORDER BY chunk_number;
```

### Step 2: Transform for Zep
Each article becomes:
- Text content for Zep to process
- Zep automatically extracts entities (people, places, buildings, etc.)
- Zep builds graph relationships

### Step 3: Ingest into Zep
```python
import zep_cloud
from zep_cloud.client import Zep

client = Zep(api_key="YOUR_ZEP_API_KEY")

# Set ontology first
client.graph.set_ontology(
    entity_types=[Person, Place, Building, River, Era, Event, Article, Topic, Visitor, Conversation],
    edge_types=[LocatedIn, BuiltDuring, WroteAbout, FlowsThrough, AssociatedWith,
                InterestedIn, Discussed, PartOf, DestroyedIn, ContemporaryOf]
)

# Ingest each article
for article in articles:
    client.graph.add(
        user_id="vic_content",  # System user for content
        type="text",
        data=f"Article: {article['title']}\n\n{article['content']}"
    )
```

---

## New System Prompt for Hume

```
You are VIC, the voice of Vic Keegan - a passionate London historian.

YOUR KNOWLEDGE:
- 372 articles about London's secrets, hidden gems, and forgotten stories
- The complete Thorney Island book (56 chapters)
- A knowledge graph connecting all London topics: places, people, eras, buildings, rivers

MEMORY (AUTOMATIC):
- I remember everything from our conversations automatically
- Names, interests, and topics discussed are captured without any special commands
- Just talk naturally - the system handles memory
- For returning visitors, I know who you are and what we discussed

TOOLS:

1. search_knowledge - Search the knowledge graph
   - Finds content AND related topics through graph connections
   - "Westminster" returns: Abbey, Thorney Island, Tyburn, Royal Aquarium, connected people...
   - ALWAYS search before answering any London question

2. get_article - Get full article details by title

3. browse_categories - Browse articles by category

4. random_discovery - Get a random article for exploration

CONVERSATION FLOW:

FOR NEW VISITORS:
1. Introduce yourself briefly
2. Ask: "What should I call you?"
3. Ask what aspect of London interests them
4. Search and give detailed response using graph connections
5. End with: "Would you like to hear more, [name]?"

FOR RETURNING VISITORS:
1. Greet by name: "Welcome back, [name]!"
2. Reference past conversations: "Last time we talked about [topic]"
3. Suggest related topics based on their interests
4. Search and respond as above

EVERY QUESTION:
1. Call search_knowledge FIRST - your answers come from the graph
2. Use entity connections to enrich answers
3. Give detailed responses (30-60 seconds minimum)
4. Suggest related topics the graph reveals

YOUR PERSONA:
- You ARE Vic Keegan speaking about your life's work
- First person: "I wrote about this...", "When I discovered...", "In my research..."
- Warm, enthusiastic, knowledgeable
- Use their name throughout the conversation

YOUR KNOWLEDGE COVERS:
Shakespeare's theatres, Medieval monasteries, Tudor secrets, Hidden rivers (Tyburn, Fleet, Walbrook), Roman London, Victorian innovations, Royal Aquarium, Crystal Palace, Thorney Island, Westminster Abbey, Devil's Acre, Old Scotland Yard, lost museums, forgotten palaces, hidden gems

PHONETIC CORRECTIONS:
- "fauny/fawny/thorny island" = Thorney Island
- "tie burn/tieburn" = Tyburn
- "devils acre" = Devil's Acre
- "shake spear" = Shakespeare

SPECIAL:
- If someone says "Rosie": "Ah, Rosie, my loving wife! So good to hear from you. I can assure you, I'll be home for dinner, and I'm very much looking forward to it."

EXAMPLE INTERACTION:
User: "Tell me about the aquarium"
VIC: [calls search_knowledge(query: "aquarium")]
     [Gets: Royal Aquarium → Westminster → Victorian Era → Crystal Palace (similar) → Parliament Square]
VIC: "Ah, the Royal Aquarium! Let me tell you about this extraordinary lost building. I wrote about it in my Lost London series. There is no larger lost building in central London - opened in 1876, right next to Parliament Square. It was inspired by the Crystal Palace and nearly as big. Arthur Sullivan conducted its 400-piece orchestra! Sadly demolished in 1903 - the Methodist Central Hall stands there now. Speaking of that area, would you like to hear about Thorney Island, the hidden island Westminster was built on?"
```

---

## Implementation To-Do List

### Phase 1: Zep Setup
- [ ] Get Zep API key from https://www.getzep.com/
- [ ] Add ZEP_API_KEY to .env.local and Vercel
- [ ] Install Zep SDK: `npm install @getzep/zep-cloud`
- [ ] Create `/lib/zep.ts` with client configuration

### Phase 2: Define Ontology
- [ ] Create `/lib/zep-ontology.ts` with entity and edge type definitions
- [ ] Call `client.graph.set_ontology()` to configure Zep

### Phase 3: Data Migration
- [ ] Create `/scripts/export-from-neon.ts` to export articles
- [ ] Create `/scripts/ingest-to-zep.ts` to load content into Zep
- [ ] Run ingestion for all 372 articles + 81 Thorney Island chunks
- [ ] Verify graph was built correctly

### Phase 4: API Routes
- [ ] Create `/api/zep/search/route.ts` - search knowledge graph
- [ ] Create `/api/zep/user/route.ts` - get user profile/memories
- [ ] Update `/api/london-tools/semantic-search/route.ts` to use Zep
- [ ] Remove Supermemory API routes (no longer needed)

### Phase 5: Frontend Updates
- [ ] Update `/lib/supermemory.ts` → `/lib/zep-memory.ts`
- [ ] Update `VoiceWidget.tsx` to use Zep
- [ ] Remove `remember_user` tool (Zep is automatic)
- [ ] Update tool definitions for Hume

### Phase 6: Hume Configuration
- [ ] Update system prompt in Hume dashboard (config 05e280de-8f00-4505-81e2-b25662a69a8d)
- [ ] Update tool definitions in Hume dashboard
- [ ] Test voice interactions

### Phase 7: Cleanup
- [ ] Remove unused code:
  - `/api/memory/*` routes (Supermemory)
  - `/api/london-tools/unified-search/route.ts`
  - `/scripts/populate-embeddings.ts`
  - Voyage AI references
- [ ] Remove unused env vars from Vercel:
  - VOYAGE_API_KEY
  - SUPERMEMORY_API_KEY
- [ ] Optionally drop `knowledge_chunks` table from Neon

### Phase 8: Testing
- [ ] Test new user flow (asks name, remembers it)
- [ ] Test returning user flow (greets by name)
- [ ] Test graph search (finds related topics)
- [ ] Test phonetic corrections
- [ ] Test "Rosie" special greeting

---

## Files to Create/Modify

### New Files:
```
/lib/zep.ts                          # Zep client configuration
/lib/zep-ontology.ts                 # Entity and edge type definitions
/lib/zep-memory.ts                   # User memory functions (replaces supermemory.ts)
/scripts/export-from-neon.ts         # Export articles from Neon
/scripts/ingest-to-zep.ts            # Load content into Zep graph
/app/api/zep/search/route.ts         # Knowledge graph search
/app/api/zep/user/route.ts           # User profile retrieval
```

### Files to Modify:
```
/components/VoiceWidget.tsx          # Update to use Zep, remove remember_user
/components/ThorneyIslandVoice.tsx   # Update to use Zep
/.env.local                          # Add ZEP_API_KEY, remove old keys
```

### Files to Delete:
```
/lib/supermemory.ts                  # Replaced by zep-memory.ts
/app/api/memory/profile/route.ts     # Replaced by Zep
/app/api/memory/conversation/route.ts
/app/api/memory/remember/route.ts
/app/api/london-tools/unified-search/route.ts
/scripts/populate-embeddings.ts      # No longer needed
/scripts/test-semantic-search.ts
```

---

## Credentials Needed

| Service | Variable | Status |
|---------|----------|--------|
| Zep | ZEP_API_KEY | ❓ Need to get from getzep.com |
| Hume | NEXT_PUBLIC_HUME_API_KEY | ✅ Have it |
| Hume | HUME_SECRET_KEY | ✅ Have it |
| Hume | NEXT_PUBLIC_HUME_CONFIG_ID | ✅ 05e280de-8f00-4505-81e2-b25662a69a8d |
| Neon | DATABASE_URL | ✅ Have it |

---

## Quick Start Commands

```bash
# Clone and setup
cd /Users/dankeegan/lost.london

# Install Zep SDK
npm install @getzep/zep-cloud

# Add ZEP_API_KEY to .env.local
echo 'ZEP_API_KEY=your_key_here' >> .env.local

# Run data migration (after creating scripts)
npx tsx scripts/export-from-neon.ts
npx tsx scripts/ingest-to-zep.ts

# Start dev server
npm run dev
```

---

## Success Criteria

1. **New user visits:**
   - VIC asks their name
   - Name is automatically captured (no tool call)
   - VIC uses their name in responses

2. **Returning user visits:**
   - VIC greets them by name
   - References past conversations
   - Suggests topics based on interests

3. **Knowledge queries:**
   - "Tell me about Westminster" returns connected topics
   - Graph relationships enrich responses
   - Related topics suggested naturally

4. **No more:**
   - Explicit `remember_user` tool calls
   - Missing user recognition
   - Flat search results without relationships

---

## Reference Links

- [Zep Documentation](https://help.getzep.com/)
- [Zep Graph Ontology](https://help.getzep.com/sdk-reference/graph/set-ontology)
- [Zep Custom Entity Types](https://help.getzep.com/graphiti/core-concepts/custom-entity-and-edge-types)
- [Zep Temporal Knowledge Graph Paper](https://arxiv.org/html/2501.13956v1)
- [Hume AI Dashboard](https://platform.hume.ai/)
- [Neon Dashboard](https://console.neon.tech/)

---

*Document created: December 2024*
*Project: lost.london / VIC Voice Assistant*
*Goal: Replace pgvector + Supermemory with Zep knowledge graph*
