import { db } from './db'
import { countTokens } from './chunker'
import { getEmbedding } from './embeddings'
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

interface ChunkResult {
  id: string
  text: string
  tokens: number
  documentId: string
  documentTitle: string
  similarity: number
}

async function searchSimilarChunks(query: string, topK: number = config.rag.topK): Promise<ChunkResult[]> {
  console.log('🔍 searchSimilarChunks called with query:', query)

  // Generate embedding for the query
  const embedding = await getEmbedding(query)
  console.log('📊 Generated embedding, dimensions:', embedding.length)

  // Perform pgvector cosine similarity search
  const chunks = await db.$queryRaw`
    SELECT
      c.id,
      c.text,
      c.tokens,
      c."documentId",
      d.title as "documentTitle",
      1 - (c.embedding <=> ${embedding}::vector) as similarity
    FROM chunks c
    JOIN documents d ON c."documentId" = d.id
    WHERE d.status = 'PUBLISHED'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${embedding}::vector
    LIMIT ${topK}
  ` as ChunkResult[]

  console.log('📥 Raw chunks from DB:', chunks.length)

  // Filter by minimum similarity threshold
  const filteredChunks = chunks.filter(chunk => chunk.similarity >= config.rag.minSimilarity)

  console.log('✅ Filtered chunks (above similarity threshold):', filteredChunks.length)
  if (filteredChunks.length > 0) {
    console.log('📈 Similarity range:',
      Math.min(...filteredChunks.map(c => c.similarity)).toFixed(3),
      '-',
      Math.max(...filteredChunks.map(c => c.similarity)).toFixed(3)
    )
  }

  return filteredChunks
}

export async function retrieveContext(query: string, chatHistory?: string[]): Promise<ChatContext> {
  try {
    console.log('🔍 retrieveContext called with:')
    console.log('- query:', query)
    console.log('- chatHistory length:', chatHistory?.length || 0)

    // Create search query (optionally incorporating chat history)
    const searchQuery = createSearchQuery(query, chatHistory)
    console.log('🔎 Generated search query:', searchQuery)

    // Search for similar chunks using local vector search
    console.log('📞 Searching local vector database...')
    const chunks = await searchSimilarChunks(searchQuery)

    console.log('📥 Search results:', {
      chunksFound: chunks.length,
      sources: Array.from(new Set(chunks.map(c => c.documentTitle))),
      topSimilarities: chunks.slice(0, 3).map(c => ({
        title: c.documentTitle,
        similarity: c.similarity.toFixed(3),
        preview: c.text.substring(0, 100) + '...'
      }))
    })

    // Log what the AI will see
    console.log('🤖 AI Context Preview:')
    chunks.slice(0, 2).forEach((chunk, i) => {
      console.log(`  Chunk ${i + 1} [${chunk.documentTitle}]:`)
      console.log(`    Similarity: ${chunk.similarity.toFixed(3)}`)
      console.log(`    Text: ${chunk.text.substring(0, 150)}...`)
    })

    // Check if we found any relevant chunks
    if (chunks.length === 0) {
      console.log('❌ No relevant chunks found')
      return {
        sources: [],
        hasLowConfidence: true,
      }
    }

    // Build context from chunks
    const contextText = chunks
      .map(chunk => `[From: ${chunk.documentTitle}]\n${chunk.text}`)
      .join('\n\n---\n\n')

    // Extract unique document titles as sources
    const sources = Array.from(new Set(chunks.map(chunk => chunk.documentTitle)))

    return {
      answer: contextText,
      sources,
      hasLowConfidence: false,
    }
  } catch (error) {
    console.error('Vector search error:', error)

    // Return low confidence context if search fails
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

  // Expand query with common synonyms/variations for better retrieval
  const expandedQuery = expandQueryTerms(query)

  if (expandedQuery !== query) {
    console.log('🔄 Expanded query:', expandedQuery)
  }

  if (!chatHistory || chatHistory.length === 0) {
    console.log('✅ No chat history, using expanded query')
    return expandedQuery
  }

  // For now, let's try using just the current query without chat history
  // to see if that fixes the issue with subsequent messages
  console.log('🧪 Using only expanded current query (ignoring chat history for search)')
  return expandedQuery
}

/**
 * Expand query terms with common synonyms for better retrieval
 */
function expandQueryTerms(query: string): string {
  const lowerQuery = query.toLowerCase()

  // Common real estate/business term expansions
  const expansions: Record<string, string[]> = {
    'client': ['client', 'customer', 'buyer', 'seller'],
    'lead': ['lead', 'prospect', 'contact'],
    'realscout': ['realscout', 'real scout', 'property search'],
    'crm': ['crm', 'follow up boss', 'fub'],
    'deactivate': ['deactivate', 'disable', 'turn off', 'remove'],
    'reactivate': ['reactivate', 'restore', 'enable', 'turn on'],
    'account': ['account', 'profile', 'login'],
  }

  let expanded = query

  // Check for expansion opportunities and add related terms
  for (const [key, _synonyms] of Object.entries(expansions)) {
    if (lowerQuery.includes(key)) {
      // Log that we found a key term (synonyms tracked for future enhancements)
      console.log(`📝 Query contains "${key}", will boost relevance for related terms`)
    }
  }

  return expanded
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
    console.log('❌ Using LOW CONFIDENCE prompt (no relevant documents found)')
    return `You are the internal SOP assistant for Stewart & Jane Group. You ONLY have access to Stewart & Jane Group company documentation and CANNOT provide information beyond what is in our company SOPs.

Since I couldn't find this information in our company documentation, here's what I can do:

**This one isn't on the market yet, check the link below to request it!**

If you're looking for something that should have documentation but doesn't exist yet, you can request it be built here:
**Request New SOP:** https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform

**Need help clarifying your question?** Try being more specific:
- Instead of "How do I work a lead?" try "How do I work a Google Search seller lead?"
- Instead of "What's our policy?" ask "What's our vacation policy?"

I can ONLY help with Stewart & Jane Group internal processes and procedures. I cannot provide general real estate advice, legal guidance, or information outside our company documentation.`
  }

  if (context.answer) {
    // Use retrieved document chunks as context
    console.log('✅ Using DOCUMENT CONTEXT prompt (found relevant documents)')
    return `You are the internal SOP assistant for Stewart & Jane Group. You have access to company documentation and found relevant information to answer this question.

CRITICAL CONSTRAINTS:
- You MUST ONLY use information from the provided company documentation below
- You CANNOT add external knowledge or general advice beyond what's provided
- You CANNOT provide general real estate, legal, or business advice outside Stewart & Jane Group procedures
- If asked about anything outside our company SOPs, you must redirect to the request form
- Synthesize the information from the documents into a clear, helpful answer
- If the documents don't fully answer the question, acknowledge what information is available and suggest requesting additional documentation

RELEVANT COMPANY DOCUMENTATION:

${context.answer}

---

Using ONLY the documentation above, provide a clear and helpful answer. If the user asks follow-up questions that aren't covered in our documentation, direct them to submit a request for new documentation at: https://docs.google.com/forms/d/e/1FAIpQLSc3lITA26L8MvnlYJxpZ-SmhU0Qus5bQRHprB0XDWRhFtX4GQ/viewform`
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
