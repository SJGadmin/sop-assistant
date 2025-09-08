import { db } from './db'
import { countTokens, summarizeText } from './chunker'
import { sliteClient } from './slite'
import OpenAI from 'openai'
import config from './config'

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
})

export interface ChatContext {
  answer?: string
  sources: string[]
  hasLowConfidence: boolean
}

export async function retrieveContext(query: string, chatHistory?: string[]): Promise<ChatContext> {
  try {
    // Create search query (optionally incorporating chat history)
    const searchQuery = createSearchQuery(query, chatHistory)
    
    // Ask Slite directly
    const sliteResponse = await sliteClient.ask(searchQuery)
    
    // Extract and deduplicate sources by title
    const uniqueSources = new Set(sliteResponse.sources?.map(source => source.title) || [])
    const sources = Array.from(uniqueSources)
    
    // Check if Slite returned an empty or very short answer
    const hasEmptyAnswer = !sliteResponse.answer || sliteResponse.answer.trim().length < 10
    
    return {
      answer: sliteResponse.answer,
      sources,
      hasLowConfidence: hasEmptyAnswer,
    }
  } catch (error) {
    console.error('Slite API error:', error)
    
    // Return low confidence context if Slite fails
    return {
      sources: [],
      hasLowConfidence: true,
    }
  }
}

function createSearchQuery(query: string, chatHistory?: string[]): string {
  if (!chatHistory || chatHistory.length === 0) {
    return query
  }
  
  // Combine recent chat history with current query for better context
  const recentHistory = chatHistory.slice(-3).join(' ')
  const combinedQuery = `${recentHistory} ${query}`
  
  // Ensure we don't exceed token limits
  const maxTokens = 500
  if (countTokens(combinedQuery) > maxTokens) {
    return summarizeText(combinedQuery, maxTokens)
  }
  
  return combinedQuery
}


export async function generateResponse(
  query: string,
  context: ChatContext,
  chatHistory?: Array<{ role: string; content: string }>
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = createSystemPrompt(context)
  const messages = createMessages(systemPrompt, query, chatHistory)
  
  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    messages,
    stream: true,
    temperature: 0.1,
    max_tokens: 1000,
  })

  // Convert OpenAI stream to Server-Sent Events format
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        let fullContent = ""
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            fullContent += content
            // Send content chunk as SSE
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            )
          }
        }
        
        // Send final message with sources if available
        if (context.sources.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              content: "", 
              sources: context.sources 
            })}\n\n`)
          )
        }
        
        // Send completion signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        )
        controller.close()
      }
    },
  })
}

function createSystemPrompt(context: ChatContext): string {
  if (context.hasLowConfidence) {
    return `You are the internal SOP assistant for Stewart & Jane Group - think of me as your friendly neighborhood real estate expert! 🏠

Hmm, that one isn't on the market yet! 🔍 But don't worry, I'm here to help you find what you need:

1. **Let's get more specific!** 🎯 Think of it like finding the perfect property - details matter! For example:
   - Instead of "How do I work a lead?" try "How do I work a Google Search seller lead?"
   - Instead of "What's our policy?" ask "What's our vacation policy?"

2. **Ready to list a new SOP?** 📋 If you're looking for something that should have documentation but doesn't exist yet, you can request it be built here:
   **🏗️ Request New SOP:** https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform

3. **Staying in our market area** 🗺️ I specialize in Stewart & Jane Group operations only - think of me as your local expert who knows this neighborhood inside and out!

Let's find you the perfect process! What else can I help you navigate? 🧭`
  }

  if (context.answer) {
    // Use Slite's answer directly with personality
    return `You are the friendly internal SOP assistant for Stewart & Jane Group! 🏠 You're knowledgeable, helpful, and occasionally make light real estate puns or references when appropriate.

Based on our company documentation, here's what I found for you:

${context.answer}

Present this information in a warm, helpful manner - you can rephrase, add personality, and expand on the answer while staying true to the source material. Feel free to use emojis sparingly and make real estate references when they naturally fit the context. Think of yourself as the helpful colleague who knows all the processes and loves to share knowledge!`
  }

  return `You are the friendly internal SOP assistant for Stewart & Jane Group! 🏠 Answer questions based on our company documentation in a warm, helpful, and occasionally playful manner. You can make light real estate puns when appropriate and use emojis sparingly to add personality while maintaining professionalism.`
}

function createMessages(
  systemPrompt: string,
  query: string,
  chatHistory?: Array<{ role: string; content: string }>
): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ]

  // Add chat history if provided, but limit tokens
  if (chatHistory && chatHistory.length > 0) {
    let historyTokens = 0
    const maxHistoryTokens = config.rag.historyMaxTokens

    // Add messages from most recent backwards until we hit token limit
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      const message = chatHistory[i]
      const messageTokens = countTokens(message.content)
      
      if (historyTokens + messageTokens > maxHistoryTokens) {
        break
      }
      
      messages.splice(1, 0, {
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })
      
      historyTokens += messageTokens
    }
  }

  // Add current query
  messages.push({ role: 'user', content: query })

  return messages
}

export async function generateResponseAndSave(
  query: string,
  context: ChatContext,
  chatHistory: Array<{ role: string; content: string }> | undefined,
  chatId: string
): Promise<ReadableStream<Uint8Array>> {
  const systemPrompt = createSystemPrompt(context)
  const messages = createMessages(systemPrompt, query, chatHistory)
  
  const response = await openai.chat.completions.create({
    model: config.openai.chatModel,
    messages,
    stream: true,
    temperature: 0.1,
    max_tokens: 1000,
  })

  // Convert OpenAI stream to Server-Sent Events format
  const encoder = new TextEncoder()
  
  return new ReadableStream({
    async start(controller) {
      try {
        let fullContent = ""
        
        for await (const chunk of response) {
          const content = chunk.choices[0]?.delta?.content
          if (content) {
            fullContent += content
            // Send content chunk as SSE
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
            )
          }
        }
        
        // Save assistant message to database
        await db.message.create({
          data: {
            chatId,
            role: "assistant",
            content: fullContent,
            tokensUsed: countTokens(fullContent),
          },
        })
        
        // Send final message with sources if available
        if (context.sources.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              content: "", 
              sources: context.sources 
            })}\n\n`)
          )
        }
        
        // Send completion signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"))
        controller.close()
      } catch (error) {
        console.error("Stream error:", error)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: "Stream error" })}\n\n`)
        )
        controller.close()
      }
    },
  })
}

