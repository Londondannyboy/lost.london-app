import { NextRequest, NextResponse } from 'next/server'
import { neonAuth } from '@neondatabase/neon-js/auth/next'
import { sql } from '@/lib/db'

/**
 * Pending Interests API
 * Human-in-the-loop validation for user interests
 *
 * Topics are stored as "pending" until user confirms them.
 * Only confirmed interests are synced to Zep for personalization.
 */

// GET - retrieve user's pending and confirmed interests
export async function GET(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = request.nextUrl.searchParams.get('status') || 'all'

    let interests
    if (status === 'all') {
      interests = await sql`
        SELECT id, topic, article_id, article_title, article_slug, status, created_at, confirmed_at
        FROM pending_interests
        WHERE user_id = ${user.id}
        ORDER BY created_at DESC
        LIMIT 50
      `
    } else {
      interests = await sql`
        SELECT id, topic, article_id, article_title, article_slug, status, created_at, confirmed_at
        FROM pending_interests
        WHERE user_id = ${user.id} AND status = ${status}
        ORDER BY created_at DESC
        LIMIT 50
      `
    }

    // Count by status
    const counts = await sql`
      SELECT status, COUNT(*) as count
      FROM pending_interests
      WHERE user_id = ${user.id}
      GROUP BY status
    `

    const countMap = {
      pending: 0,
      confirmed: 0,
      rejected: 0,
    }
    for (const row of counts) {
      countMap[row.status as keyof typeof countMap] = parseInt(row.count)
    }

    return NextResponse.json({
      interests,
      counts: countMap,
    })
  } catch (error) {
    console.error('[Interests API] GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch interests' }, { status: 500 })
  }
}

// POST - create a new pending interest (called by CLM after article match)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, topic, articleId, articleTitle, articleSlug, source } = body

    if (!userId || !topic) {
      return NextResponse.json({ error: 'Missing userId or topic' }, { status: 400 })
    }

    // Insert or update (upsert) - if same article, update the topic/timestamp
    await sql`
      INSERT INTO pending_interests (user_id, topic, article_id, article_title, article_slug, source)
      VALUES (${userId}, ${topic}, ${articleId || null}, ${articleTitle || null}, ${articleSlug || null}, ${source || 'conversation'})
      ON CONFLICT (user_id, article_id)
      DO UPDATE SET topic = ${topic}, created_at = NOW()
      WHERE pending_interests.status = 'pending'
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Interests API] POST error:', error)
    return NextResponse.json({ error: 'Failed to create interest' }, { status: 500 })
  }
}

// PATCH - confirm or reject an interest (human-in-the-loop validation)
export async function PATCH(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { interestId, action } = body

    if (!interestId || !action || !['confirm', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Missing interestId or invalid action' }, { status: 400 })
    }

    const newStatus = action === 'confirm' ? 'confirmed' : 'rejected'

    // Update the interest status
    const result = await sql`
      UPDATE pending_interests
      SET status = ${newStatus}, confirmed_at = ${action === 'confirm' ? new Date().toISOString() : null}
      WHERE id = ${interestId} AND user_id = ${user.id}
      RETURNING id, topic, article_id, article_title, article_slug, status
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    const interest = result[0]

    // If confirmed, sync to Zep for personalization
    if (action === 'confirm' && interest.article_title) {
      try {
        // Call CLM to store validated fact in Zep
        const CLM_URL = process.env.NEXT_PUBLIC_CLM_URL || 'https://vic-clm.vercel.app'
        await fetch(`${CLM_URL}/api/store-validated-interest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            fact: `User is interested in ${interest.article_title}`,
            articleId: interest.article_id,
            articleTitle: interest.article_title,
            validated: true,
          }),
        })
      } catch (zepError) {
        console.error('[Interests API] Zep sync error:', zepError)
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      interest,
    })
  } catch (error) {
    console.error('[Interests API] PATCH error:', error)
    return NextResponse.json({ error: 'Failed to update interest' }, { status: 500 })
  }
}

// DELETE - remove a pending interest
export async function DELETE(request: NextRequest) {
  try {
    const { user } = await neonAuth()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const interestId = request.nextUrl.searchParams.get('id')
    if (!interestId) {
      return NextResponse.json({ error: 'Missing interest id' }, { status: 400 })
    }

    await sql`
      DELETE FROM pending_interests
      WHERE id = ${interestId} AND user_id = ${user.id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Interests API] DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete interest' }, { status: 500 })
  }
}
