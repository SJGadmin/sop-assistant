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

    console.log("Ingestion endpoint called - no longer needed with Slite's ask API")
    
    return NextResponse.json({
      message: "No document ingestion needed - using Slite's ask API directly",
      processed: 0,
      updated: 0,
      errors: [],
    })
  } catch (error) {
    console.error("Ingestion API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}