import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    // Dynamic imports to avoid build-time issues
    const { db } = await import("@/lib/db")
    const { retrieveContext, generateResponseAndSave } = await import("@/lib/rag")
    const { countTokens } = await import("@/lib/chunker")

    const { chatId, message } = await request.json()

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    // Verify chat exists
    const chat = await db.chat.findFirst({
      where: {
        id: chatId,
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

    console.log('📋 Chat API - Chat history loaded:')
    console.log('- Total messages in DB:', recentMessages.length)
    console.log('- Chat history for context:', chatHistory.map((msg, i) => `${i}: ${msg.role}: ${msg.content.substring(0, 50)}...`))

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
    const searchHistoryContext = chatHistory.slice(-5).map((msg: any) => msg.content)
    console.log('🔍 Chat API - Sending to retrieveContext:')
    console.log('- Current message:', message)
    console.log('- Search history context:', searchHistoryContext)
    
    const context = await retrieveContext(message, searchHistoryContext)

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
    
    // Log more detailed error information
    if (error instanceof Error) {
      console.error("Error name:", error.name)
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }
    
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}