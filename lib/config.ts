import { env } from './env'

export const config = {
  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.OPENAI_CHAT_MODEL,
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
  },

  // Blob Storage
  blob: {
    token: env.BLOB_READ_WRITE_TOKEN,
  },

  // RAG
  rag: {
    topK: env.TOP_K,
    minSimilarity: env.MIN_SIMILARITY,
    chunkSize: env.CHUNK_SIZE,
    chunkOverlap: env.CHUNK_OVERLAP,
    historyMaxTokens: env.HISTORY_MAX_TOKENS,
  },

  // Rate Limiting
  rateLimit: {
    requests: env.RATE_LIMIT_REQUESTS,
    windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  },
} as const

export default config