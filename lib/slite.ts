import config from './config'

export interface SliteNote {
  id: string
  title: string
  content: string
  updated_at: string
  channel?: string
  tags?: string[]
}

export interface SliteSearchResponse {
  notes: SliteNote[]
  total: number
}

class SliteClient {
  private baseUrl = config.slite.baseUrl
  private apiKey = config.slite.apiKey

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`Slite API error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async searchNotes(query: string = '', limit: number = 100): Promise<SliteNote[]> {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
    })
    
    if (config.slite.channelFilter) {
      params.append('channel', config.slite.channelFilter)
    }

    const response = await this.request<SliteSearchResponse>(
      `/search-notes?${params.toString()}`
    )

    return response.notes
  }

  async getNote(id: string): Promise<SliteNote> {
    return this.request<SliteNote>(`/notes/${id}`)
  }

  async getAllNotes(): Promise<SliteNote[]> {
    let allNotes: SliteNote[] = []
    let page = 1
    const limit = 100

    while (true) {
      const notes = await this.searchNotes('', limit)
      if (notes.length === 0) break
      
      allNotes = allNotes.concat(notes)
      if (notes.length < limit) break
      
      page++
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return allNotes
  }

  // Convert HTML content to plain text
  htmlToText(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }
}

export const sliteClient = new SliteClient()