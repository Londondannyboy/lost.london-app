# VIC 2.0: Custom Language Model Implementation Plan

## Mission
Build a new voice interface for Lost London using Pydantic AI + Hume CLM to **guarantee factual accuracy** through architectural control rather than prompt engineering.

---

## Current State (VIC 1.0)

```
User speaks → Hume EVI → Hume's LLM decides what to say
                              ↓
                        Calls tool (maybe)
                              ↓
                        Tool returns article data
                              ↓
                        Hume's LLM generates response (might hallucinate)
                              ↓
                        EVI speaks
```

**Problems:**
- Hume's LLM can ignore tool results
- No validation before speech
- Hallucinations about architects, dates, names
- Prompt engineering is unreliable

---

## Target State (VIC 2.0)

```
User speaks → Hume EVI (voice only) → YOUR CLM Server
                                           ↓
                                    1. Parse user intent
                                    2. Query pgvector (Neon)
                                    3. Retrieve article content
                                    4. Generate response with Claude
                                    5. Pydantic AI validates:
                                       - All facts in source? ✓
                                       - No external knowledge? ✓
                                       - Persona correct? ✓
                                    6. Return validated text
                                           ↓
                                    EVI speaks EXACTLY your text
```

**Benefits:**
- Architectural guarantee of accuracy
- Facts validated before speech
- Full control over persona
- Same database, better results

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         HUME EVI                                │
│                   (Voice In/Out Only)                           │
│              Config: CLM mode enabled                           │
│              CLM URL: https://vic-clm.vercel.app/api/clm        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ SSE Connection
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VIC CLM SERVER                               │
│                  (Python / FastAPI)                             │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                  PYDANTIC AI AGENT                       │   │
│  │                                                          │   │
│  │  System Prompt: You are Vic Keegan...                   │   │
│  │  Tools:                                                  │   │
│  │    - search_articles(query) → pgvector                  │   │
│  │    - get_user_memory(user_id) → Supermemory             │   │
│  │                                                          │   │
│  │  Result Type: ValidatedVICResponse                       │   │
│  │    - response_text: str                                  │   │
│  │    - facts_cited: list[str]                             │   │
│  │    - source_titles: list[str]                           │   │
│  │                                                          │   │
│  │  Validators:                                             │   │
│  │    - Every fact must exist in retrieved articles        │   │
│  │    - No names/dates not in source                       │   │
│  │    - Response matches Vic's persona                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    DATA LAYER                            │   │
│  │                                                          │   │
│  │  Neon PostgreSQL (existing)                             │   │
│  │    - knowledge_chunks (616 chunks, voyage-2 embeddings) │   │
│  │    - embedding_cache                                     │   │
│  │                                                          │   │
│  │  Voyage AI (existing)                                    │   │
│  │    - Query embedding generation                          │   │
│  │                                                          │   │
│  │  Supermemory (existing)                                  │   │
│  │    - User preferences and history                        │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Component | Technology | Reason |
|-----------|------------|--------|
| CLM Server | Python + FastAPI | Pydantic AI is Python-native |
| AI Agent | Pydantic AI v1.0 | Structured output + validation |
| LLM | Claude 3.5 Sonnet | Best reasoning, Anthropic native |
| Database | Neon PostgreSQL | Existing, pgvector ready |
| Embeddings | Voyage AI | Existing, voyage-2 model |
| Hosting | Vercel (Python) or Railway | Easy deployment |
| Voice | Hume EVI (CLM mode) | Existing account |

---

## Project Structure

```
vic-clm/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI app + SSE endpoint
│   ├── agent.py             # Pydantic AI agent definition
│   ├── models.py            # Response models + validators
│   ├── tools.py             # search_articles, get_user_memory
│   └── database.py          # Neon connection + queries
├── tests/
│   ├── test_agent.py        # Agent response tests
│   ├── test_validation.py   # Fact validation tests
│   └── test_integration.py  # End-to-end tests
├── requirements.txt
├── vercel.json              # Or railway.json
└── README.md
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
**Goal:** Basic CLM server that responds to Hume

- [ ] Create new repo: `vic-clm`
- [ ] Set up Python project with FastAPI
- [ ] Implement SSE endpoint for Hume CLM
- [ ] Connect to existing Neon database
- [ ] Basic response: echo back user input
- [ ] Test with Hume CLM config

**Deliverable:** Hume speaks back what user says

### Phase 2: Article Retrieval (Day 1-2)
**Goal:** Query articles from pgvector

- [ ] Port hybrid search logic from TypeScript to Python
- [ ] Implement Voyage AI embedding generation
- [ ] Create `search_articles` tool
- [ ] Test retrieval accuracy
- [ ] Add phonetic corrections

**Deliverable:** Server retrieves relevant articles

### Phase 3: Pydantic AI Agent (Day 2-3)
**Goal:** Generate responses with validation

- [ ] Define `ValidatedVICResponse` model
- [ ] Implement fact-grounding validators
- [ ] Create Pydantic AI agent with tools
- [ ] Add Vic Keegan persona prompt
- [ ] Test with known queries (Ignatius Sancho, Royal Aquarium)

**Deliverable:** Validated responses generated

### Phase 4: Integration (Day 3-4)
**Goal:** Full pipeline working

- [ ] Connect agent to CLM endpoint
- [ ] Stream responses via SSE
- [ ] Handle conversation context
- [ ] Add user memory (Supermemory integration)
- [ ] Error handling and fallbacks

**Deliverable:** Complete voice interaction working

### Phase 5: Testing & Refinement (Day 4-5)
**Goal:** Production ready

- [ ] Test problem queries:
  - "Who designed the Royal Aquarium?" → Should say "My articles don't mention the designer"
  - "Tell me about Ignatius Sancho" → Should cite facts from article
  - "Who built X?" → Should only answer if in article
- [ ] Tune validation strictness
- [ ] Add logging and monitoring
- [ ] Deploy to production
- [ ] Create new Hume config for CLM

**Deliverable:** VIC 2.0 live

---

## Key Code Components

### 1. Response Model with Validation

```python
# models.py
from pydantic import BaseModel, field_validator, model_validator

class ValidatedVICResponse(BaseModel):
    """Response that is guaranteed to be grounded in source articles."""

    response_text: str
    facts_stated: list[str]  # Each fact mentioned in response
    source_content: str      # The article content used
    source_titles: list[str] # Articles referenced

    @field_validator('facts_stated')
    @classmethod
    def facts_must_be_in_source(cls, facts: list[str], info) -> list[str]:
        source = info.data.get('source_content', '').lower()
        for fact in facts:
            # Check key terms from fact exist in source
            key_terms = [t for t in fact.lower().split() if len(t) > 4]
            if not any(term in source for term in key_terms):
                raise ValueError(f"Fact not grounded in source: {fact}")
        return facts

    @model_validator(mode='after')
    def no_architect_unless_mentioned(self) -> 'ValidatedVICResponse':
        """Specific check: don't mention architects unless in source."""
        architect_words = ['architect', 'designed by', 'built by', 'designer']
        response_lower = self.response_text.lower()
        source_lower = self.source_content.lower()

        for word in architect_words:
            if word in response_lower:
                # If we mention architect, it must be in source
                if word not in source_lower:
                    raise ValueError(f"Mentioned '{word}' but not in source article")
        return self
```

### 2. Pydantic AI Agent

```python
# agent.py
from pydantic_ai import Agent
from models import ValidatedVICResponse
from tools import search_articles, get_user_memory

vic_agent = Agent(
    'anthropic:claude-3-5-sonnet-latest',
    result_type=ValidatedVICResponse,
    system_prompt="""You are VIC, the voice of Vic Keegan - a London historian.

ABSOLUTE RULES:
1. ONLY state facts from the retrieved articles
2. If asked about something not in the articles, say "My articles don't cover that"
3. NEVER guess architects, builders, designers, or dates
4. Cite which article your facts come from
5. Speak warmly as Vic, in first person

For each fact you state, add it to facts_stated so it can be validated.""",
    tools=[search_articles, get_user_memory],
)
```

### 3. CLM SSE Endpoint

```python
# main.py
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from agent import vic_agent
import json

app = FastAPI()

@app.post("/api/clm")
async def clm_endpoint(request: Request):
    """Hume CLM endpoint - receives context, returns text via SSE."""

    body = await request.json()
    messages = body.get('messages', [])

    # Get last user message
    user_message = next(
        (m['content'] for m in reversed(messages) if m['role'] == 'user'),
        None
    )

    if not user_message:
        return {"type": "text", "content": "I didn't catch that. Could you repeat?"}

    async def generate():
        try:
            # Run Pydantic AI agent with validation
            result = await vic_agent.run(user_message)

            # Stream the validated response
            yield f"data: {json.dumps({'type': 'text', 'content': result.data.response_text})}\n\n"

        except ValidationError as e:
            # Validation failed - respond safely
            yield f"data: {json.dumps({'type': 'text', 'content': 'I want to be accurate, so let me say: my articles don\\'t have that specific detail.'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### 4. Article Search Tool

```python
# tools.py
from pydantic_ai import Tool
import asyncpg
import httpx

async def search_articles(query: str) -> dict:
    """Search Lost London articles using hybrid vector + keyword search."""

    # Normalize query (phonetic corrections)
    normalized = normalize_query(query)

    # Get embedding from Voyage AI
    embedding = await get_voyage_embedding(normalized)

    # Query Neon pgvector
    conn = await asyncpg.connect(DATABASE_URL)

    results = await conn.fetch("""
        WITH vector_results AS (
            SELECT id, title, content,
                   1 - (embedding <=> $1::vector) as score
            FROM knowledge_chunks
            ORDER BY embedding <=> $1::vector
            LIMIT 10
        )
        SELECT * FROM vector_results
        WHERE score > 0.5
        ORDER BY score DESC
        LIMIT 5
    """, embedding)

    await conn.close()

    return {
        "articles": [dict(r) for r in results],
        "query": normalized
    }
```

---

## Hume CLM Configuration

In Hume Dashboard, create new config:

1. **Name:** `VIC-CLM-v2`
2. **Language Model:** Custom Language Model
3. **CLM URL:** `https://vic-clm.vercel.app/api/clm`
4. **Connection Type:** SSE (recommended)
5. **Voice:** Same as current VIC
6. **System Prompt:** (Minimal - your CLM handles this)

---

## Testing Matrix

| Query | Expected Behavior | Validation |
|-------|-------------------|------------|
| "Tell me about Ignatius Sancho" | Rich response with facts from article | ✓ All facts in source |
| "Who designed the Royal Aquarium?" | "My articles don't mention the designer" | ✓ No architect hallucination |
| "What year was X built?" | Only answer if date in article | ✓ Date in source |
| "Tell me about Thomas Cubitt" | Only if we have an article | ✓ No made-up content |
| "My name is Sarah" | Remember + acknowledge | ✓ Supermemory called |

---

## Rollback Plan

VIC 1.0 (current) remains untouched. If VIC 2.0 has issues:
1. Switch Hume config back to original
2. Users hit lost.london as normal
3. No database changes needed

---

## Success Metrics

1. **Zero hallucinations** about architects/designers not in articles
2. **100% fact grounding** - every stated fact traceable to source
3. **Same personality** - still sounds like Vic Keegan
4. **Response time** < 3 seconds
5. **User satisfaction** - qualitative testing

---

## Environment Variables (New App)

```env
# Anthropic (for Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Neon (existing database)
DATABASE_URL=postgresql://neondb_owner:...

# Voyage AI (existing)
VOYAGE_API_KEY=pa-...

# Supermemory (existing)
SUPERMEMORY_API_KEY=sm_...

# Hume (for token generation if needed)
HUME_API_KEY=...
HUME_SECRET_KEY=...
```

---

## Timeline

| Day | Phase | Outcome |
|-----|-------|---------|
| 1 | Foundation + Retrieval | CLM responds, articles retrieved |
| 2 | Pydantic AI Agent | Validated responses generated |
| 3 | Integration | Full pipeline working |
| 4 | Testing | Problem queries fixed |
| 5 | Deploy | VIC 2.0 live |

---

## Questions to Resolve

1. **Hosting:** Vercel (Python functions) or Railway (full server)?
2. **Streaming:** SSE or WebSocket for CLM?
3. **Fallback:** What to say when validation fails repeatedly?
4. **Memory:** Port Supermemory integration or start fresh?

---

## Next Steps

1. Review and approve this plan
2. Create `vic-clm` repository
3. Begin Phase 1 implementation

---

*Plan created: December 23, 2024*
*Goal: Eliminate hallucinations through architectural control*
