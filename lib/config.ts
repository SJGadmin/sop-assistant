import { env } from './env'

export const config = {
  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    chatModel: env.OPENAI_CHAT_MODEL,
    embeddingModel: 'text-embedding-3-small',
    embeddingDimensions: 1536,
  },
  
  // Slite
  slite: {
    apiKey: env.SLITE_API_KEY,
    baseUrl: 'https://api.slite.com/v1',
    channelFilter: env.SLITE_CHANNEL_FILTER,
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
  
  // Auth
  auth: {
    allowedEmails: env.ALLOWED_EMAILS.split(',').map(email => email.trim()),
  },
} as const

export default config