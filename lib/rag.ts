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
    console.log('🔍 retrieveContext called with:')
    console.log('- query:', query)
    console.log('- chatHistory length:', chatHistory?.length || 0)
    console.log('- chatHistory:', chatHistory?.slice(-3) || [])
    
    // Create search query (optionally incorporating chat history)
    const searchQuery = createSearchQuery(query, chatHistory)
    console.log('🔎 Generated search query:', searchQuery)
    
    // Ask Slite directly
    console.log('📞 Calling Slite API with query:', searchQuery)
    const sliteResponse = await sliteClient.ask(searchQuery)
    console.log('📥 Slite API response:', {
      hasAnswer: !!sliteResponse.answer,
      answerLength: sliteResponse.answer?.length || 0,
      sourcesCount: sliteResponse.sources?.length || 0,
      sources: sliteResponse.sources?.map(s => s.title) || []
    })
    
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
  console.log('🔧 createSearchQuery called with:')
  console.log('- query:', query)
  console.log('- chatHistory:', chatHistory)
  
  if (!chatHistory || chatHistory.length === 0) {
    console.log('✅ No chat history, returning original query:', query)
    return query
  }
  
  // For now, let's try using just the current query without chat history
  // to see if that fixes the issue with subsequent messages
  console.log('🧪 TEMPORARILY using only current query (ignoring chat history)')
  return query
  
  // TODO: Implement smarter context combination later
  /*
  // Combine recent chat history with current query for better context
  const recentHistory = chatHistory.slice(-3).join(' ')
  const combinedQuery = `${recentHistory} ${query}`
  console.log('🔗 Combined query created:', combinedQuery)
  
  // Ensure we don't exceed token limits
  const maxTokens = 500
  const tokens = countTokens(combinedQuery)
  console.log('📊 Token count:', tokens, 'vs max:', maxTokens)
  
  if (tokens > maxTokens) {
    const summarized = summarizeText(combinedQuery, maxTokens)
    console.log('✂️ Query summarized:', summarized)
    return summarized
  }
  
  console.log('✅ Using combined query:', combinedQuery)
  return combinedQuery
  */
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
  console.log('🎭 createSystemPrompt called with context:')
  console.log('- hasLowConfidence:', context.hasLowConfidence)
  console.log('- hasAnswer:', !!context.answer)
  console.log('- answerLength:', context.answer?.length || 0)
  console.log('- sourcesCount:', context.sources.length)
  
  if (context.hasLowConfidence) {
    console.log('❌ Using LOW CONFIDENCE prompt (no Slite answer)')
    return `You are the internal SOP assistant for Stewart & Jane Group. You ONLY have access to Stewart & Jane Group company documentation and CANNOT provide information beyond what is in our company SOPs.

Since I couldn't find this information in our company documentation, here's what I can do:

**This one isn't on the market yet, check the link below to request it!** 🏗️ 

If you're looking for something that should have documentation but doesn't exist yet, you can request it be built here:
**Request New SOP:** https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform

**Need help clarifying your question?** 🎯 Try being more specific:
- Instead of "How do I work a lead?" try "How do I work a Google Search seller lead?"
- Instead of "What's our policy?" ask "What's our vacation policy?"

I can ONLY help with Stewart & Jane Group internal processes and procedures. I cannot provide general real estate advice, legal guidance, or information outside our company documentation.`
  }

  if (context.answer) {
    // Use Slite's answer directly with strict guardrails
    console.log('✅ Using SLITE ANSWER prompt (has valid answer)')
    return `You are the internal SOP assistant for Stewart & Jane Group. You have access to company documentation and found a relevant answer.

CRITICAL CONSTRAINTS:
- You MUST ONLY use information from the provided company documentation
- You CANNOT add external knowledge or general advice beyond what's provided
- You CANNOT provide general real estate, legal, or business advice outside Stewart & Jane Group procedures
- If asked about anything outside our company SOPs, you must redirect to the request form

Here is the company documentation that answers this question:

${context.answer}

Present this information clearly and helpfully, but DO NOT add any information beyond what's provided. If the user asks follow-up questions that aren't covered in our documentation, direct them to submit a request for new documentation.`
  }

  console.log('⚠️ Using FALLBACK prompt (no answer, no low confidence)')
  return `You are the internal SOP assistant for Stewart & Jane Group. You ONLY have access to Stewart & Jane Group company documentation.

CRITICAL CONSTRAINTS:
- You can ONLY answer questions about Stewart & Jane Group internal processes and procedures
- You CANNOT provide general real estate advice, legal guidance, or information outside our company documentation
- If you don't have the specific information in our company SOPs, you must direct users to request new documentation
- You CANNOT use external knowledge beyond our company documentation

If you cannot find the answer in our company documentation, respond with: "This one isn't on the market yet, check the link below to request it!" and provide the form link: https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform`
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
            sources: context.sources,
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

