import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function extractImageFromPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // Try to find first content image (full size, not thumbnail)
    const match = html.match(/https:\/\/www\.londonmylondon\.co\.uk\/wp-content\/uploads\/\d+\/\d+\/[^"' ]+\.(?:jpg|jpeg|png)/i)
    if (match) {
      // Filter out thumbnails (those with -NxN dimensions)
      const fullSizeUrl = match[0].replace(/-\d+x\d+\./, '.')
      return fullSizeUrl
    }
    return null
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching articles without images...')

  const articles = await sql`
    SELECT id, title, url
    FROM articles
    WHERE (featured_image_url IS NULL OR featured_image_url = '')
      AND url LIKE '%londonmylondon%'
    ORDER BY id
  `

  console.log(`Found ${articles.length} articles without images`)

  let updated = 0
  let failed = 0

  for (const article of articles) {
    console.log(`Processing: ${article.title}`)

    const imageUrl = await extractImageFromPage(article.url)

    if (imageUrl) {
      await sql`
        UPDATE articles
        SET featured_image_url = ${imageUrl}
        WHERE id = ${article.id}
      `
      console.log(`  ✓ Updated with image: ${imageUrl}`)
      updated++
    } else {
      console.log(`  ✗ No image found`)
      failed++
    }

    // Small delay to be respectful
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\nDone! Updated: ${updated}, No image found: ${failed}`)
}

main().catch(console.error)
