import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/documents - List all documents
export async function GET() {
  try {
    const documents = await db.document.findMany({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { chunks: true }
        }
      }
    })

    return NextResponse.json({ documents })
  } catch (error) {
    console.error('Failed to list documents:', error)
    return NextResponse.json(
      { error: 'Failed to list documents' },
      { status: 500 }
    )
  }
}

// POST /api/admin/documents - Create a new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, markdown } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    const document = await db.document.create({
      data: {
        title: title.trim(),
        markdown: markdown || '',
        content: markdown || '', // Store same content for display
        status: 'DRAFT',
      }
    })

    return NextResponse.json({ document })
  } catch (error) {
    console.error('Failed to create document:', error)
    return NextResponse.json(
      { error: 'Failed to create document' },
      { status: 500 }
    )
  }
}
