import { z } from 'zod'

const envSchema = z.object({
  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),
  
  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4o-mini'),
  
  // Slite
  SLITE_API_KEY: z.string().min(1),
  SLITE_CHANNEL_FILTER: z.string().optional(),
  
  // Access Control
  ALLOWED_EMAILS: z.string().min(1),
  
  // Rate Limiting
  RATE_LIMIT_REQUESTS: z.coerce.number().default(30),
  RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().default(10),
  
  // RAG Configuration
  TOP_K: z.coerce.number().default(8),
  MIN_SIMILARITY: z.coerce.number().default(0.75),
  CHUNK_SIZE: z.coerce.number().default(1000),
  CHUNK_OVERLAP: z.coerce.number().default(200),
  HISTORY_MAX_TOKENS: z.coerce.number().default(2000),
})

export const env = envSchema.parse(process.env)

export type Env = z.infer<typeof envSchema>