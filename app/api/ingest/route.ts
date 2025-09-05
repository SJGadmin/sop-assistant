import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Check if request is from authenticated user or cron
    const session = await getServerSession(authOptions)
    const authHeader = request.headers.get('authorization')
    
    // Allow cron jobs (Vercel cron sends auth header) or authenticated users
    const isAuthorized = session?.user || authHeader === `Bearer ${process.env.CRON_SECRET}`
    
    if (!isAuthorized) {
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