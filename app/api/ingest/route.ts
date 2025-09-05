import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Allow cron jobs with proper secret
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("Starting document ingestion...")
    
    // Dynamic import to avoid build-time issues
    const { ingestSliteDocs } = await import("@/lib/rag")
    const result = await ingestSliteDocs()
    
    console.log(`Ingestion completed: ${result.processed} processed, ${result.updated} updated`)
    
    if (result.errors.length > 0) {
      console.error("Ingestion errors:", result.errors)
    }

    return NextResponse.json({
      message: `Processed ${result.processed} documents, updated ${result.updated}`,
      ...result,
    })
  } catch (error) {
    console.error("Ingestion API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}