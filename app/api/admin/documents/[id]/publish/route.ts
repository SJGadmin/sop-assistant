import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { chunkText } from '@/lib/chunker'
import { getEmbeddings } from '@/lib/embeddings'

// POST /api/admin/documents/[id]/publish - Publish document and generate embeddings
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get the document
    const document = await db.document.findUnique({ where: { id } })
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }

    if (!document.markdown || document.markdown.trim().length === 0) {
      return NextResponse.json(
        { error: 'Document has no content to publish' },
        { status: 400 }
      )
    }

    // Set status to PROCESSING
    await db.document.update({
      where: { id },
      data: { status: 'PROCESSING' }
    })

    try {
      // Delete any existing chunks for this document
      await db.chunk.deleteMany({ where: { documentId: id } })

      // Chunk the markdown content
      const chunks = chunkText(document.markdown)
      console.log(`📄 Document "${document.title}" chunked into ${chunks.length} chunks`)

      if (chunks.length === 0) {
        throw new Error('No chunks generated from content')
      }

      // Get embeddings for all chunks at once (batch)
      const texts = chunks.map(c => c.text)
      console.log(`🔄 Generating embeddings for ${texts.length} chunks...`)
      const embeddings = await getEmbeddings(texts)
      console.log(`✅ Generated ${embeddings.length} embeddings`)

      // Save chunks with embeddings using raw SQL for vector type
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        const embedding = embeddings[i]
        const chunkId = crypto.randomUUID()

        await db.$executeRaw`
          INSERT INTO chunks (id, "documentId", idx, text, tokens, embedding, "createdAt")
          VALUES (
            ${chunkId},
            ${id},
            ${chunk.index},
            ${chunk.text},
            ${chunk.tokens},
            ${embedding}::vector,
            NOW()
          )
        `
      }

      console.log(`✅ Saved ${chunks.length} chunks with embeddings`)

      // Set status to PUBLISHED
      const publishedDocument = await db.document.update({
        where: { id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        document: publishedDocument,
        chunksCreated: chunks.length
      })
    } catch (processingError) {
      // If processing fails, reset status to DRAFT
      await db.document.update({
        where: { id },
        data: { status: 'DRAFT' }
      })
      throw processingError
    }
  } catch (error) {
    console.error('Failed to publish document:', error)
    return NextResponse.json(
      { error: 'Failed to publish document', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
