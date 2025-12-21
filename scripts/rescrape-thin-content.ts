import { neon } from '@neondatabase/serverless'
import { config } from 'dotenv'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function scrapeArticleContent(url: string): Promise<{ content: string; image: string | null }> {
  try {
    // Use curl for onlondon (more reliable)
    if (url.includes('onlondon')) {
      const { execSync } = await import('child_process')
      const html = execSync(`curl -s "${url}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 })

      // Extract content from onlondon articles
      const contentMatch = html.match(/<div[^>]*class="[^"]*(?:entry-content|article-content|post-content)[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<aside|<\/article)/i)
      let content = ''

      if (contentMatch) {
        content = contentMatch[1]
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#8217;/g, "'")
          .replace(/&#8216;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&#8211;/g, '–')
          .replace(/&#8212;/g, '—')
          .replace(/&#039;/g, "'")
          .trim()
      }

      // Image for onlondon
      const imageMatch = html.match(/https:\/\/www\.onlondon\.co\.uk\/wp-content\/uploads\/\d+\/\d+\/[^"' ]+\.(?:jpg|jpeg|png)/i)
      const image = imageMatch ? imageMatch[0].replace(/-\d+x\d+\./, '.') : null

      return { content, image }
    }

    // Original fetch for londonmylondon
    const response = await fetch(url)
    const html = await response.text()

    // Extract main content - look for entry-content div
    const contentMatch = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:div|footer|aside)/i)
    let content = ''

    if (contentMatch) {
      content = contentMatch[1]
        // Remove HTML tags but keep paragraph breaks
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        // Clean up whitespace
        .replace(/\n{3,}/g, '\n\n')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .trim()
    }

    // Try to get featured image
    const imageMatch = html.match(/https:\/\/www\.londonmylondon\.co\.uk\/wp-content\/uploads\/\d+\/\d+\/[^"' ]+\.(?:jpg|jpeg|png)/i)
    const image = imageMatch ? imageMatch[0].replace(/-\d+x\d+\./, '.') : null

    return { content, image }
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error)
    return { content: '', image: null }
  }
}

async function main() {
  console.log('Finding articles with thin content...')

  // Get articles with less than 1000 characters of content
  const articles = await sql`
    SELECT id, title, url, LENGTH(content) as content_length, featured_image_url
    FROM articles
    WHERE LENGTH(content) < 1000
      AND title != 'Multiple Choices'
    ORDER BY content_length ASC
  `

  console.log(`Found ${articles.length} articles with thin content`)

  let updated = 0
  let imageUpdated = 0
  let failed = 0

  for (const article of articles) {
    console.log(`\nProcessing: ${article.title}`)
    console.log(`  Current length: ${article.content_length}`)

    const { content, image } = await scrapeArticleContent(article.url)

    if (content && content.length > (article.content_length as number)) {
      await sql`
        UPDATE articles
        SET content = ${content}
        WHERE id = ${article.id}
      `
      console.log(`  ✓ Updated content: ${content.length} characters`)
      updated++
    } else if (content) {
      console.log(`  - Content not longer (${content.length} chars), skipping`)
    } else {
      console.log(`  ✗ Failed to extract content`)
      failed++
    }

    // Update image if missing
    if (!article.featured_image_url && image) {
      await sql`
        UPDATE articles
        SET featured_image_url = ${image}
        WHERE id = ${article.id}
      `
      console.log(`  ✓ Updated image: ${image}`)
      imageUpdated++
    }

    // Small delay to be respectful
    await new Promise(r => setTimeout(r, 300))
  }

  console.log(`\n\nDone!`)
  console.log(`Content updated: ${updated}`)
  console.log(`Images updated: ${imageUpdated}`)
  console.log(`Failed: ${failed}`)
}

main().catch(console.error)
