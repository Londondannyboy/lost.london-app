import { neon } from '@neondatabase/serverless'

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const DATABASE_URL = process.env.DATABASE_URL

async function getQueryEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: [text],
      model: 'voyage-2',
    }),
  })
  const data = await response.json()
  return data.data[0].embedding
}

async function semanticSearch(query: string) {
  const sql = neon(DATABASE_URL!)
  console.log(`\nQuery: "${query}"\n`)

  const embedding = await getQueryEmbedding(query)

  const results = await sql`
    SELECT
      source_type,
      title,
      LEFT(content, 150) as preview,
      1 - (embedding <=> ${JSON.stringify(embedding)}::vector) as similarity
    FROM knowledge_chunks
    ORDER BY embedding <=> ${JSON.stringify(embedding)}::vector
    LIMIT 5
  `

  console.log('Top 5 results:')
  for (const r of results) {
    console.log(`\n[${(r.similarity * 100).toFixed(1)}%] ${r.source_type}: ${r.title}`)
    console.log(`   ${r.preview}...`)
  }
}

const query = process.argv[2] || 'aquarium'
semanticSearch(query)
