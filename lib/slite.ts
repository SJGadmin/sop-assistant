import config from './config'

export interface SliteAskResponse {
  answer: string
  sources?: Array<{
    title: string
    url?: string
    snippet?: string
  }>
}

class SliteClient {
  private baseUrl = config.slite.baseUrl
  private apiKey = config.slite.apiKey

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Slite API key is not configured')
    }

    const url = `${this.baseUrl}${endpoint}`
    
    console.log(`Making Slite API request to: ${url}`)
    console.log(`Using API key: ${this.apiKey.substring(0, 20)}...`)
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'x-slite-api-key': this.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Slite API error: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Slite API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async ask(question: string): Promise<SliteAskResponse> {
    console.log('Asking Slite:', question)

    const url = `/ask?question=${encodeURIComponent(question)}`
    const response = await this.request<SliteAskResponse>(url)
    
    console.log('Slite response:', response)
    return response
  }

}

export const sliteClient = new SliteClient()