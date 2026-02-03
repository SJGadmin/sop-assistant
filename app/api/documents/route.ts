import { NextResponse } from "next/server"

export const runtime = "nodejs"

// NOTE: After schema changes, run `npm run db:generate` to update Prisma types
export async function GET() {
  try {
    // Dynamic imports to avoid build-time issues
    const { db } = await import("@/lib/db")

    // Only return published documents for public viewing
    // Using raw query to avoid type issues until Prisma client is regenerated
    const documents = await (db.document.findMany as any)({
      where: {
        status: 'PUBLISHED',
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        content: true,
        markdown: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      documents: documents.map((doc: any) => ({
        ...doc,
        updatedAt: doc.updatedAt?.toISOString?.() || doc.updatedAt,
        createdAt: doc.createdAt?.toISOString?.() || doc.createdAt,
        publishedAt: doc.publishedAt?.toISOString?.() || doc.publishedAt,
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
