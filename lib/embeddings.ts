import OpenAI from 'openai'
import config from './config'

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
})

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: config.openai.embeddingModel,
    input: text,
    dimensions: config.openai.embeddingDimensions,
  })

  return response.data[0].embedding
}

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: config.openai.embeddingModel,
    input: texts,
    dimensions: config.openai.embeddingDimensions,
  })

  return response.data.map(item => item.embedding)
}