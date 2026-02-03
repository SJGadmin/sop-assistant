import { getEncoding } from 'js-tiktoken'
import config from './config'

const encoding = getEncoding('cl100k_base')

export interface EnhancedChunk {
  text: string
  tokens: number
  index: number
  heading?: string  // Section heading for context
  metadata?: string // Additional context like "Step 1", "Purpose", etc.
}

export function countTokens(text: string): number {
  return encoding.encode(text).length
}

/**
 * Strip HTML tags but preserve text content and structure
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim()
}

/**
 * Extract sections from HTML content with their headings
 */
function extractSections(html: string): Array<{ heading: string; content: string; level: number }> {
  const sections: Array<{ heading: string; content: string; level: number }> = []

  // Split by heading tags while preserving them
  const parts = html.split(/(<h[1-6][^>]*>.*?<\/h[1-6]>)/i)

  let currentHeading = ''
  let currentLevel = 0
  let currentContent = ''

  for (const part of parts) {
    const headingMatch = part.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i)

    if (headingMatch) {
      // Save previous section if it exists
      if (currentContent.trim()) {
        sections.push({
          heading: currentHeading,
          content: currentContent,
          level: currentLevel
        })
      }

      // Start new section
      currentLevel = parseInt(headingMatch[1])
      currentHeading = stripHtml(headingMatch[2])
      currentContent = ''
    } else if (part.trim()) {
      currentContent += part
    }
  }

  // Add final section
  if (currentContent.trim() || currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent,
      level: currentLevel
    })
  }

  return sections
}

/**
 * Enhanced chunking that respects document structure and adds context
 */
export function chunkTextWithContext(
  text: string,
  maxTokens = config.rag.chunkSize,
  overlap = config.rag.chunkOverlap
): EnhancedChunk[] {
  const chunks: EnhancedChunk[] = []
  let chunkIndex = 0

  // Check if this is HTML content
  const isHtml = text.trim().startsWith('<')

  if (isHtml) {
    // Extract sections with headings
    const sections = extractSections(text)

    for (const section of sections) {
      const cleanContent = stripHtml(section.content)
      const sectionText = section.heading
        ? `${section.heading}\n\n${cleanContent}`
        : cleanContent

      const sectionTokens = countTokens(sectionText)

      // If section fits in one chunk, add it directly
      if (sectionTokens <= maxTokens) {
        chunks.push({
          text: sectionText.trim(),
          tokens: sectionTokens,
          index: chunkIndex++,
          heading: section.heading || undefined,
        })
      } else {
        // Split large sections into smaller chunks
        const sentences = cleanContent.split(/[.!?]+\s+/).filter(s => s.trim().length > 0)
        let currentChunk = section.heading ? `${section.heading}\n\n` : ''
        let currentTokens = countTokens(currentChunk)

        for (const sentence of sentences) {
          const sentenceWithPunctuation = sentence.trim() + '.'
          const sentenceTokens = countTokens(sentenceWithPunctuation)

          if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
            // Save current chunk
            chunks.push({
              text: currentChunk.trim(),
              tokens: currentTokens,
              index: chunkIndex++,
              heading: section.heading || undefined,
            })

            // Start new chunk with heading context and overlap
            if (overlap > 0 && currentChunk) {
              const overlapText = getOverlapText(currentChunk, overlap)
              currentChunk = section.heading
                ? `${section.heading}\n\n${overlapText} ${sentenceWithPunctuation}`
                : `${overlapText} ${sentenceWithPunctuation}`
              currentTokens = countTokens(currentChunk)
            } else {
              currentChunk = section.heading
                ? `${section.heading}\n\n${sentenceWithPunctuation}`
                : sentenceWithPunctuation
              currentTokens = countTokens(currentChunk)
            }
          } else {
            currentChunk += (currentChunk.endsWith('\n\n') ? '' : ' ') + sentenceWithPunctuation
            currentTokens += sentenceTokens
          }
        }

        // Add final chunk from this section
        if (currentChunk.trim().length > 0) {
          chunks.push({
            text: currentChunk.trim(),
            tokens: currentTokens,
            index: chunkIndex++,
            heading: section.heading || undefined,
          })
        }
      }
    }
  } else {
    // Plain text chunking (markdown or plain text)
    const sentences = text.split(/[.!?]+\s+/).filter(s => s.trim().length > 0)
    let currentChunk = ''
    let currentTokens = 0

    for (const sentence of sentences) {
      const sentenceWithPunctuation = sentence.trim() + '.'
      const sentenceTokens = countTokens(sentenceWithPunctuation)

      if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          tokens: currentTokens,
          index: chunkIndex++,
        })

        if (overlap > 0) {
          const overlapText = getOverlapText(currentChunk, overlap)
          currentChunk = `${overlapText} ${sentenceWithPunctuation}`
          currentTokens = countTokens(currentChunk)
        } else {
          currentChunk = sentenceWithPunctuation
          currentTokens = sentenceTokens
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation
        currentTokens += sentenceTokens
      }
    }

    if (currentChunk.trim().length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        tokens: currentTokens,
        index: chunkIndex,
      })
    }
  }

  console.log(`📦 Created ${chunks.length} enhanced chunks with context`)
  if (chunks.length > 0) {
    console.log(`📊 Token range: ${Math.min(...chunks.map(c => c.tokens))}-${Math.max(...chunks.map(c => c.tokens))} tokens`)
    const chunksWithHeadings = chunks.filter(c => c.heading).length
    console.log(`📑 Chunks with heading context: ${chunksWithHeadings}/${chunks.length}`)
  }

  return chunks
}

function getOverlapText(text: string, overlapTokens: number): string {
  const words = text.split(' ')
  let overlap = ''
  let tokens = 0

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
