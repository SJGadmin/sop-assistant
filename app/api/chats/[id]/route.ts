import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db")

    const chat = await db.chat.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    })

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    const messages = await db.message.findMany({
      where: {
        chatId: params.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        role: true,
        content: true,
        sources: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db")
    
    const { title } = await request.json()

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      )
    }

    const chat = await db.chat.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    })

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Update the chat title
    await db.chat.update({
      where: { id: params.id },
      data: { title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating chat:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Dynamic import to avoid build-time issues
    const { db } = await import("@/lib/db")

    const chat = await db.chat.findFirst({
      where: {
        id: params.id,
        deletedAt: null,
      },
    })

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 })
    }

    // Soft delete the chat
    await db.chat.update({
      where: { id: params.id },
      data: { deletedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting chat:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}