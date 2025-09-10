import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    // Dynamic imports to avoid build-time issues
    const { db } = await import("@/lib/db")

    const documents = await db.document.findMany({
      orderBy: {
        sliteUpdatedAt: 'desc',
      },
      select: {
        id: true,
        sliteId: true,
        title: true,
        content: true,
        markdown: true,
        url: true,
        sliteUpdatedAt: true,
        sliteCreatedAt: true,
      },
    })

    return NextResponse.json({
      documents: documents.map(doc => ({
        ...doc,
        sliteUpdatedAt: doc.sliteUpdatedAt.toISOString(),
        sliteCreatedAt: doc.sliteCreatedAt?.toISOString(),
      })),
    })

  } catch (error) {
    console.error("Documents API error:", error)
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}