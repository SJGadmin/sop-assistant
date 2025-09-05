import { db } from './db'
import { getEmbedding, getEmbeddings } from './embeddings'
import { chunkText, countTokens, summarizeText } from './chunker'
import { sliteClient } from './slite'
import OpenAI from 'openai'
import config from './config'
import crypto from 'crypto'

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
})

export interface RetrievedChunk {
  text: string
  documentTitle: string
  similarity: number
}

export interface ChatContext {
  chunks: RetrievedChunk[]
  sources: string[]
  hasLowConfidence: boolean
}

export async function retrieveContext(query: string, chatHistory?: string[]): Promise<ChatContext> {
  // Create search query (optionally incorporating chat history)
  const searchQuery = createSearchQuery(query, chatHistory)
  
  // Get embedding for the search query
  const queryEmbedding = await getEmbedding(searchQuery)
  
  // Perform vector similarity search
  const chunks = await vectorSearch(queryEmbedding, config.rag.topK)
  
  // Filter by minimum similarity threshold
  const filteredChunks = chunks.filter(chunk => chunk.similarity >= config.rag.minSimilarity)
  
  // Check if we have low confidence (no chunks above threshold)
  const hasLowConfidence = filteredChunks.length === 0
  
  // Get unique source document titles
  const sourceSet = new Set(filteredChunks.map(chunk => chunk.documentTitle))
  const sources = Array.from(sourceSet)
  
  return {
    chunks: filteredChunks,
    sources,
    hasLowConfidence,
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

async function vectorSearch(embedding: number[], limit: number): Promise<RetrievedChunk[]> {
  const embeddingString = `[${embedding.join(',')}]`
  
  const results = await db.$queryRaw<Array<{
    text: string
    document_title: string
    similarity: number
  }>>`
    SELECT 
      c.text,
      d.title as document_title,
      1 - (c.embedding <-> ${embeddingString}::vector) as similarity
    FROM chunks c
    JOIN documents d ON c."documentId" = d.id
    WHERE c.embedding IS NOT NULL
    ORDER BY c.embedding <-> ${embeddingString}::vector
    LIMIT ${limit}
  `
  
  return results.map(result => ({
    text: result.text,
    documentTitle: result.document_title,
    similarity: result.similarity,
  }))
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
    return `You are an internal SOP assistant for Stewart & Jane Group. The user's question doesn't have a clear match in the knowledge base.

Ask 1 concise clarifying question and provide 2-3 specific suggestions to help narrow down what they're looking for.

Keep responses brief and focused on getting better context.`
  }

  const contextText = context.chunks
    .map(chunk => `Source: ${chunk.documentTitle}\n${chunk.text}`)
    .join('\n\n---\n\n')

  return `You are an internal SOP assistant for Stewart & Jane Group. Answer questions using the provided knowledge base excerpts.

Guidelines:
- Answer concisely and directly
- Use information only from the provided sources
- If the sources don't fully answer the question, say so
- Include relevant details and procedures when helpful
- Maintain a professional, helpful tone
- Do not mention sources in your response as they will be handled separately

Knowledge Base:
${contextText}`
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

export async function ingestSliteDocs(): Promise<{ processed: number; updated: number; errors: string[] }> {
  let processed = 0
  let updated = 0
  const errors: string[] = []

  try {
    const notes = await sliteClient.getAllNotes()
    
    for (const note of notes) {
      try {
        await ingestDocument(note)
        processed++
        
        // Check if document was actually updated
        const existingDoc = await db.document.findUnique({
          where: { sliteId: note.id },
        })
        
        if (existingDoc) {
          const newHash = createDocumentHash(note)
          if (existingDoc.hash !== newHash) {
            updated++
          }
        } else {
          updated++
        }
        
      } catch (error) {
        const errorMsg = `Failed to ingest ${note.title}: ${error instanceof Error ? error.message : 'Unknown error'}`
        errors.push(errorMsg)
        console.error(errorMsg)
      }
    }
    
  } catch (error) {
    const errorMsg = `Failed to fetch notes from Slite: ${error instanceof Error ? error.message : 'Unknown error'}`
    errors.push(errorMsg)
    console.error(errorMsg)
  }

  return { processed, updated, errors }
}

async function ingestDocument(note: any): Promise<void> {
  const plainTextContent = sliteClient.htmlToText(note.content || '')
  const documentHash = createDocumentHash(note)
  
  // Check if document has changed
  const existingDoc = await db.document.findUnique({
    where: { sliteId: note.id },
  })
  
  if (existingDoc && existingDoc.hash === documentHash) {
    return // No changes, skip processing
  }

  // Delete existing chunks if updating
  if (existingDoc) {
    await db.chunk.deleteMany({
      where: { documentId: existingDoc.id },
    })
  }

  // Upsert document
  const document = await db.document.upsert({
    where: { sliteId: note.id },
    update: {
      title: note.title,
      updatedAt: new Date(note.updated_at),
      hash: documentHash,
    },
    create: {
      sliteId: note.id,
      title: note.title,
      updatedAt: new Date(note.updated_at),
      hash: documentHash,
    },
  })

  // Chunk the text
  const chunks = chunkText(plainTextContent)
  
  // Generate embeddings for all chunks
  const chunkTexts = chunks.map(chunk => chunk.text)
  const embeddings = await getEmbeddings(chunkTexts)
  
  // Store chunks with embeddings
  const chunkData = chunks.map((chunk, index) => ({
    documentId: document.id,
    idx: chunk.index,
    text: chunk.text,
    tokens: chunk.tokens,
    embedding: embeddings[index],
  }))

  // Insert chunks in batches to avoid memory issues
  const batchSize = 100
  for (let i = 0; i < chunkData.length; i += batchSize) {
    const batch = chunkData.slice(i, i + batchSize)
    
    for (const chunk of batch) {
      await db.$executeRaw`
        INSERT INTO chunks ("id", "documentId", "idx", "text", "tokens", "embedding", "createdAt")
        VALUES (${crypto.randomUUID()}, ${chunk.documentId}, ${chunk.idx}, ${chunk.text}, ${chunk.tokens}, ${JSON.stringify(chunk.embedding)}::vector, NOW())
      `
    }
  }
}

function createDocumentHash(note: any): string {
  const content = `${note.title}|${note.content}|${note.updated_at}`
  return crypto.createHash('md5').update(content).digest('hex')
}