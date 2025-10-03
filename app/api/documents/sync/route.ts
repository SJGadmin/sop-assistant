import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const { syncDocumentsFromSlite } = await import("@/lib/sync-documents")

    console.log('🔄 Manual sync triggered via API')
    const result = await syncDocumentsFromSlite()

    // Verify documents were actually synced with content
    const { db } = await import("@/lib/db")
    const docsWithContent = await db.document.count({
      where: {
        OR: [
          { content: { not: null } },
          { markdown: { not: null } }
        ]
      }
    })
    const totalDocs = await db.document.count()

    console.log(`📊 Sync verification: ${docsWithContent}/${totalDocs} documents have content`)

    return NextResponse.json({
      success: true,
      message: 'Document sync completed successfully',
      result: {
        ...result,
        totalDocuments: totalDocs,
        documentsWithContent: docsWithContent,
      },
    })

  } catch (error) {
    console.error("Document sync API error:", error)

    // Log the full error stack for debugging
    if (error instanceof Error) {
      console.error("Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        success: false,
        error: "Document sync failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}