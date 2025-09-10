"use client"

import * as React from "react"
import { ArrowLeft, Search, FileText } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ReactMarkdown from "react-markdown"

interface Document {
  id: string
  sliteId: string
  title: string
  content?: string
  markdown?: string
  url?: string
  sliteUpdatedAt: Date
}

export default function DocsPage() {
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncing, setSyncing] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedDoc, setSelectedDoc] = React.useState<Document | null>(null)

  // Load documents
  React.useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
    setLoading(false)
  }

  const syncDocuments = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/documents/sync', {
        method: 'POST',
      })
      if (response.ok) {
        const data = await response.json()
        console.log('Sync result:', data.result)
        // Reload documents after sync
        await loadDocuments()
      } else {
        console.error('Sync failed:', await response.text())
      }
    } catch (error) {
      console.error('Sync error:', error)
    }
    setSyncing(false)
  }

  // Filter documents based on search
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc.content && doc.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  // Generate preview text from markdown or content
  const getPreview = (doc: Document): string => {
    const text = doc.markdown || doc.content || ""
    // Remove markdown syntax, HTML tags, and URLs, get first 150 characters
    const cleanText = text
      .replace(/!\[.*?\]\(.*?\)/g, '') // Remove markdown images
      .replace(/\[.*?\]\(.*?\)/g, '') // Remove markdown links
      .replace(/#{1,6}\s+/g, '') // Remove markdown headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
    
    return cleanText.length > 150 ? cleanText.substring(0, 150) + '...' : cleanText
  }

  if (selectedDoc) {
    return (
      <div className="h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDoc(null)}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Documents</span>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{selectedDoc.title}</h1>
              <p className="text-xs text-gray-500">
                Updated {new Date(selectedDoc.sliteUpdatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <Link href="/">
            <Button variant="outline" size="sm">
              Back to Chat
            </Button>
          </Link>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-6">
            <div className="prose prose-lg max-w-none">
              {selectedDoc.markdown ? (
                <ReactMarkdown>{selectedDoc.markdown}</ReactMarkdown>
              ) : selectedDoc.content ? (
                <ReactMarkdown>{selectedDoc.content}</ReactMarkdown>
              ) : (
                <p className="text-gray-500">No content available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <img 
              src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" 
              alt="Stewart & Jane Group"
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold">All Documentation</h1>
            <p className="text-sm text-gray-600">Browse through all your SOPs and procedures</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={syncDocuments}
            disabled={syncing}
            className="flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{syncing ? 'Syncing...' : 'Sync from Slite'}</span>
          </Button>
          <Link href="/">
            <Button variant="outline" size="sm">
              Back to Chat
            </Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b bg-gray-50">
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Documents Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading documents...</div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="h-12 w-12 mb-4" />
            <p className="text-lg mb-2">No documents found</p>
            <p className="text-sm">
              {searchQuery ? 'Try adjusting your search terms' : 'Documents will appear here once synced from Slite'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:border-gray-300 cursor-pointer transition-all duration-200"
              >
                {/* Document Icon */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Updated {new Date(doc.sliteUpdatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Document Preview */}
                <p className="text-sm text-gray-600 line-clamp-3">
                  {getPreview(doc)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}