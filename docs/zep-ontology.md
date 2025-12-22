# VIC London History - Zep Ontology

## Entity Types (10 max)

### 1. Person
People mentioned in London history
- `name`: string - Full name
- `era`: string - Time period they lived (Roman, Medieval, Tudor, Victorian, Modern)
- `role`: string - What they did (monarch, writer, architect, etc.)

### 2. Place
Geographic locations in London
- `name`: string - Place name
- `borough`: string - Modern borough if applicable
- `exists`: boolean - Whether it still exists today

### 3. Building
Structures, monuments, venues
- `name`: string - Building name
- `built_year`: number - Year constructed
- `demolished_year`: number - Year demolished (if applicable)
- `type`: string - church, theatre, palace, prison, etc.

### 4. River
Waterways including hidden rivers
- `name`: string - River name
- `status`: string - visible, underground, lost

### 5. Era
Historical periods
- `name`: string - Era name (Roman, Medieval, Tudor, Stuart, Georgian, Victorian, Modern)
- `start_year`: number
- `end_year`: number

### 6. Event
Significant historical events
- `name`: string - Event name
- `year`: number - When it occurred
- `type`: string - fire, war, coronation, construction, etc.

### 7. Article
Vic Keegan's written pieces
- `title`: string - Article title
- `slug`: string - URL slug
- `category`: string - Hidden gems, Lost London, etc.

### 8. Topic
Themes and subjects
- `name`: string - Topic name (hidden rivers, lost theatres, etc.)

### 9. Visitor
Users interacting with VIC
- `name`: string - User's name if known
- `first_visit`: datetime - When they first visited

### 10. Conversation
Chat sessions
- `date`: datetime - When the conversation happened
- `summary`: string - Brief summary of what was discussed

---

## Edge Types (10 max)

### 1. located_in
Building/Place → Place
"Globe Theatre is located in Bankside"

### 2. built_during
Building → Era
"Royal Aquarium was built during Victorian era"

### 3. wrote_about
Person → Topic/Place/Building
"Vic Keegan wrote about Thorney Island"

### 4. flows_through
River → Place
"Tyburn flows through Westminster"

### 5. associated_with
Person → Place/Building/Event
"Shakespeare associated with Globe Theatre"

### 6. interested_in
Visitor → Topic/Era/Place
"Dan is interested in Tudor history"

### 7. discussed
Conversation → Topic/Building/Person
"We discussed the Royal Aquarium"

### 8. part_of
Place → Place, Building → Place
"Thorney Island is part of Westminster"

### 9. destroyed_in
Building → Event
"Old St Paul's destroyed in Great Fire"

### 10. contemporary_of
Person → Person
"Shakespeare contemporary of Elizabeth I"

---

## Example Graph Queries

**User asks about Westminster:**
```
Westminster
  ← part_of ← Thorney Island
  ← located_in ← Westminster Abbey
  ← located_in ← Royal Aquarium
  ← flows_through ← River Tyburn
  ← associated_with ← Edward the Confessor
```

**Returning user "Dan" asks a question:**
```
Dan (Visitor)
  → interested_in → Tudor History
  → interested_in → Hidden Rivers
  → discussed → Royal Aquarium (last session)
```

Zep surfaces: "Dan, last time we talked about the Royal Aquarium. Given your interest in Tudor history, you might enjoy hearing about Henry VIII's wine cellar..."
