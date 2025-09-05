import { describe, it, expect } from 'vitest'
import { chunkText, countTokens } from '../lib/chunker'
import { assert, assertEquals, assertApproximately } from '../lib/assert'

describe('Chunker', () => {
  it('should count tokens correctly', () => {
    const text = "Hello world"
    const tokenCount = countTokens(text)
    
    assert(tokenCount > 0, 'Token count should be greater than 0')
    assertApproximately(tokenCount, 2, 1, 'Should be approximately 2 tokens')
  })

  it('should chunk text properly', () => {
    const text = "This is sentence one. This is sentence two. This is sentence three. This is sentence four."
    const chunks = chunkText(text, 50, 10)
    
    assert(chunks.length > 0, 'Should produce at least one chunk')
    
    chunks.forEach(chunk => {
      assert(chunk.tokens <= 50, `Chunk should not exceed 50 tokens, got ${chunk.tokens}`)
      assert(chunk.text.length > 0, 'Chunk text should not be empty')
      assert(typeof chunk.index === 'number', 'Chunk should have numeric index')
    })
  })

  it('should handle overlap correctly', () => {
    const text = "First sentence. Second sentence. Third sentence. Fourth sentence."
    const chunks = chunkText(text, 30, 5)
    
    if (chunks.length > 1) {
      // Check that there's some overlap between chunks
      const firstChunk = chunks[0].text
      const secondChunk = chunks[1].text
      
      // At least some words should overlap
      const firstWords = firstChunk.split(' ')
      const secondWords = secondChunk.split(' ')
      
      const hasOverlap = firstWords.some(word => secondWords.includes(word))
      assert(hasOverlap, 'Chunks should have overlapping content')
    }
  })

  it('should handle empty text', () => {
    const chunks = chunkText("")
    assertEquals(chunks.length, 0, 'Empty text should produce no chunks')
  })

  it('should handle single sentence', () => {
    const text = "This is a single sentence."
    const chunks = chunkText(text, 100, 10)
    
    assertEquals(chunks.length, 1, 'Single sentence should produce one chunk')
    assertEquals(chunks[0].text, text, 'Chunk should contain the full sentence')
    assertEquals(chunks[0].index, 0, 'First chunk should have index 0')
  })
})