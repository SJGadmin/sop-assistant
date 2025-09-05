import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db")

    const chats = await db.chat.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ chats })
  } catch (error) {
    console.error("Error fetching chats:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db")

    const chat = await db.chat.create({
      data: {
        title: "New Chat",
      },
    })

    return NextResponse.json({ chatId: chat.id })
  } catch (error) {
    console.error("Error creating chat:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}