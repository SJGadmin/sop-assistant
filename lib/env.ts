import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url().optional(),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1, "OpenAI API key is required"),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),

  // Vercel Blob Storage (optional - for file uploads)
  BLOB_READ_WRITE_TOKEN: z.string().optional(),

  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(10),

  // RAG Configuration
  TOP_K: z.coerce.number().default(8),
  MIN_SIMILARITY: z.coerce.number().default(0.7),
  CHUNK_SIZE: z.coerce.number().default(500),
  CHUNK_OVERLAP: z.coerce.number().default(100),
  HISTORY_MAX_TOKENS: z.coerce.number().default(2000),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>