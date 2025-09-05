import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  
  // Slite
  SLITE_API_KEY: z.string().min(1).optional(),
  SLITE_CHANNEL_FILTER: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(10),
  
  // RAG Configuration
  TOP_K: z.coerce.number().default(8),
  MIN_SIMILARITY: z.coerce.number().default(0.75),
  CHUNK_SIZE: z.coerce.number().default(1000),
  CHUNK_OVERLAP: z.coerce.number().default(200),
  HISTORY_MAX_TOKENS: z.coerce.number().default(2000),
  
  // Optional cron secret for ingest endpoint
  CRON_SECRET: z.string().optional(),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>