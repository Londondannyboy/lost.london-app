import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function extractImageFromPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const html = await response.text()

    // Try og:image first
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
    if (ogMatch && !ogMatch[1].includes('holder') && !ogMatch[1].includes('penci')) {
      return ogMatch[1]
    }

    // Try to find content images from onlondon or londonmylondon
    const patterns = [
      /https:\/\/www\.onlondon\.co\.uk\/wp-content\/uploads\/\d+\/\d+\/[^"' >]+\.(?:jpg|jpeg|png)/gi,
      /https:\/\/www\.londonmylondon\.co\.uk\/wp-content\/uploads\/\d+\/\d+\/[^"' >]+\.(?:jpg|jpeg|png)/gi
    ]

    for (const pattern of patterns) {
      const matches = html.match(pattern)
      if (matches) {
        for (const match of matches) {
          // Skip placeholders and logos
          if (!match.includes('holder') && !match.includes('penci') && !match.includes('logo')) {
            return match.replace(/-\d+x\d+\./, '.')
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error)
    return null
  }
}

async function main() {
  console.log('Fetching articles with placeholder or missing images...\n')

  // Find articles with placeholder images OR missing images
  // GeoChris.jpg is the default placeholder used during initial import
  const articles = await sql`
    SELECT id, title, url, featured_image_url
    FROM articles
    WHERE (
      featured_image_url IS NULL
      OR featured_image_url = ''
      OR featured_image_url LIKE '%holder%'
      OR featured_image_url LIKE '%penci%'
      OR featured_image_url LIKE '%GeoChris%'
    )
    ORDER BY id
  `

  console.log(`Found ${articles.length} articles to fix\n`)

  let updated = 0
  let failed = 0

  for (const article of articles) {
    const imageUrl = await extractImageFromPage(article.url)

    if (imageUrl) {
      await sql`
        UPDATE articles
        SET featured_image_url = ${imageUrl}
        WHERE id = ${article.id}
      `
      console.log(`✓ ${article.title.substring(0, 50)}`)
      updated++
    } else {
      console.log(`✗ ${article.title.substring(0, 50)}`)
      failed++
    }

    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\nDone! Fixed: ${updated}, No image found: ${failed}`)
}

main().catch(console.error)
