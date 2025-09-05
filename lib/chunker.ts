import { getEncoding } from 'js-tiktoken'
import config from './config'

const encoding = getEncoding('cl100k_base')

export interface Chunk {
  text: string
  tokens: number
  index: number
}

export function countTokens(text: string): number {
  return encoding.encode(text).length
}

export function chunkText(text: string, maxTokens = config.rag.chunkSize, overlap = config.rag.chunkOverlap): Chunk[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: Chunk[] = []
  let currentChunk = ''
  let currentTokens = 0
  let chunkIndex = 0

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i].trim() + '.'
    const sentenceTokens = countTokens(sentence)

    // If adding this sentence would exceed the limit, save current chunk
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens,
        index: chunkIndex++,
      })

      // Start new chunk with overlap
      if (overlap > 0) {
        const overlapText = getOverlapText(currentChunk, overlap)
        currentChunk = overlapText + ' ' + sentence
        currentTokens = countTokens(currentChunk)
      } else {
        currentChunk = sentence
        currentTokens = sentenceTokens
      }
    } else {
      // Add sentence to current chunk
      if (currentChunk.length > 0) {
        currentChunk += ' ' + sentence
      } else {
        currentChunk = sentence
      }
      currentTokens += sentenceTokens
    }
  }

  // Add final chunk if it has content
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      tokens: currentTokens,
      index: chunkIndex,
    })
  }

  return chunks
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(' ')
  let overlap = ''
  let tokens = 0

  // Work backwards from the end to get the last N tokens
  for (let i = words.length - 1; i >= 0; i--) {
    const word = words[i]
    const wordTokens = countTokens(word)
    
    if (tokens + wordTokens > overlapTokens) {
      break
    }
    
    overlap = word + (overlap ? ' ' + overlap : '')
    tokens += wordTokens
  }

  return overlap
}

export function summarizeText(text: string, maxTokens: number): string {
  const tokens = countTokens(text)
  if (tokens <= maxTokens) {
    return text
  }

  // Simple truncation - in production you might want to use AI summarization
  const ratio = maxTokens / tokens
  const targetLength = Math.floor(text.length * ratio)
  
  // Find a good breaking point near the target
  let breakPoint = targetLength
  while (breakPoint > 0 && !/[.!?]\s/.test(text[breakPoint])) {
    breakPoint--
  }
  
  if (breakPoint === 0) {
    breakPoint = targetLength
  }
  
  return text.substring(0, breakPoint).trim() + '...'
}