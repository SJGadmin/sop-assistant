import { db } from './db'
import config from './config'

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - config.rateLimit.windowMinutes * 60 * 1000)
  
  const existingLimit = await db.rateLimit.findUnique({
    where: { userId },
  })

  if (!existingLimit) {
    // First request - create rate limit record
    await db.rateLimit.create({
      data: {
        userId,
        requests: 1,
        windowStart: new Date(),
      },
    })
    
    return {
      allowed: true,
      remaining: config.rateLimit.requests - 1,
    }
  }

  // Check if we're in a new window
  if (existingLimit.windowStart < windowStart) {
    // Reset the window
    await db.rateLimit.update({
      where: { userId },
      data: {
        requests: 1,
        windowStart: new Date(),
      },
    })
    
    return {
      allowed: true,
      remaining: config.rateLimit.requests - 1,
    }
  }

  // We're in the current window - check if limit exceeded
  if (existingLimit.requests >= config.rateLimit.requests) {
    return {
      allowed: false,
      remaining: 0,
    }
  }

  // Increment request count
  await db.rateLimit.update({
    where: { userId },
    data: {
      requests: existingLimit.requests + 1,
    },
  })

  return {
    allowed: true,
    remaining: config.rateLimit.requests - existingLimit.requests - 1,
  }
}