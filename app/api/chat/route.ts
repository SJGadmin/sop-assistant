import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Dynamic imports to avoid build-time issues
    const { db } = await import("@/lib/db")
    const { checkRateLimit } = await import("@/lib/rateLimit")
    const { retrieveContext, generateResponseAndSave } = await import("@/lib/rag")
    const { countTokens } = await import("@/lib/chunker")

    // Check rate limit
    const rateLimit = await checkRateLimit(session.user.id)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      )
    }

    const { chatId, message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Verify chat ownership
    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
        userId: session.user.id,
        deletedAt: null,
      },
    })

    if (!chat) {
      return NextResponse.json(
        { error: "Chat not found" },
        { status: 404 }
      )
    }

    // Get recent chat history for context
    const recentMessages = await db.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    const chatHistory = recentMessages
      .reverse()
      .map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }))

    // Save user message
    const userMessage = await db.message.create({
      data: {
        chatId,
        role: "user",
        content: message,
        tokensUsed: countTokens(message),
      },
    })

    // Retrieve context using RAG
    const context = await retrieveContext(
      message,
      chatHistory.slice(-5).map((msg: any) => msg.content) // Last 5 messages for search context
    )

    // Generate streaming response with database saving
    const responseStream = await generateResponseAndSave(message, context, chatHistory, chatId)

    // Create response with proper headers
    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });    

  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}