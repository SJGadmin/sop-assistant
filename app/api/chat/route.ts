import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { checkRateLimit } from "@/lib/rateLimit"
import { retrieveContext, generateResponse } from "@/lib/rag"
import { countTokens } from "@/lib/chunker"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      .map(msg => ({
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
      chatHistory.slice(-5).map(msg => msg.content) // Last 5 messages for search context
    )

    // Generate streaming response
    const responseStream = await generateResponse(message, context, chatHistory)

    // Create streaming response
    const encoder = new TextEncoder()
    
    const stream = new ReadableStream({
      async start(controller) {
        const reader = responseStream.getReader()
        let assistantContent = ""

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            assistantContent += chunk

            // Stream the content
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`)
            )
          }

          // Save assistant message and send final sources
          const assistantMessage = await db.message.create({
            data: {
              chatId,
              role: "assistant",
              content: assistantContent,
              tokensUsed: countTokens(assistantContent),
            },
          })

          // Send sources information
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream interrupted" })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    })

  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}