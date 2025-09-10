import config from './config'

export interface SliteAskResponse {
  answer: string
  sources?: Array<{
    title: string
    url?: string
    snippet?: string
  }>
}

export interface SliteNote {
  id: string
  title: string
  content?: string
  markdown?: string
  createdAt?: string
  updatedAt: string
  parentId?: string
  authorId?: string
  url?: string
  type?: string
  highlight?: string
  parentNotes?: any[]
}

export interface SliteSearchResponse {
  hits: SliteNote[]
  nbPages: number
  page: number
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

  async searchNotes(query?: string, limit = 100): Promise<SliteSearchResponse> {
    console.log('Searching Slite notes:', { query, limit })

    let url = `/search-notes?limit=${limit}`
    if (query) {
      url += `&query=${encodeURIComponent(query)}`
    }

    const response = await this.request<SliteSearchResponse>(url)
    console.log('Search response:', response)
    return response
  }

  async getNote(noteId: string): Promise<SliteNote> {
    console.log('Fetching Slite note:', noteId)

    const url = `/notes/${noteId}`
    const response = await this.request<SliteNote>(url)
    
    console.log('Note response:', response)
    return response
  }

  async getNoteChildren(noteId: string): Promise<{ notes: SliteNote[] }> {
    console.log('Fetching note children:', noteId)

    const url = `/notes/${noteId}/children`
    const response = await this.request<{ notes: SliteNote[] }>(url)
    
    console.log('Children response:', response)
    return response
  }

}

export const sliteClient = new SliteClient()