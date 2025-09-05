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
        createdAt: true,
      },
    })

    // Extract sources from assistant messages
    const messagesWithSources = messages.map(message => {
      if (message.role === "assistant") {
        // Look for sources pattern in content
        const sourcesMatch = message.content.match(/Sources: (.+)$/m)
        if (sourcesMatch) {
          const sources = sourcesMatch[1].split(', ').map(s => s.trim())
          const content = message.content.replace(/\n\nSources: .+$/m, '')
          return {
            ...message,
            content,
            sources,
          }
        }
      }
      return message
    })

    return NextResponse.json({ messages: messagesWithSources })
  } catch (error) {
    console.error("Error fetching messages:", error)
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