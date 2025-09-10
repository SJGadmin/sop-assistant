import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const { syncDocumentsFromSlite } = await import("@/lib/sync-documents")

    console.log('🔄 Manual sync triggered via API')
    const result = await syncDocumentsFromSlite()

    return NextResponse.json({
      success: true,
      message: 'Document sync completed successfully',
      result,
    })

  } catch (error) {
    console.error("Document sync API error:", error)
    
    return NextResponse.json(
      { 
        success: false,
        error: "Document sync failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    )
  }
}