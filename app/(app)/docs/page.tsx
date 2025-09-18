"use client"

import * as React from "react"
import { ArrowLeft, Search, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SOPRenderer } from "@/components/SOPRenderer"

interface Document {
  id: string
  sliteId: string
  title: string
  content?: string
  markdown?: string
  url?: string
  sliteUpdatedAt: Date
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'

interface SyncResult {
  synced: number
  updated: number
  errors: number
}

export default function DocsPage() {
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [loading, setLoading] = React.useState(true)
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('idle')
  const [syncResult, setSyncResult] = React.useState<SyncResult | null>(null)
  const [syncError, setSyncError] = React.useState<string | null>(null)
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
    setSyncStatus('syncing')
    setSyncResult(null)
    setSyncError(null)

    try {
      const response = await fetch('/api/documents/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSyncStatus('success')
        setSyncResult(data.result)
        console.log('Sync result:', data.result)
        // Reload documents after sync
        await loadDocuments()

        // Auto-hide success state after 5 seconds
        setTimeout(() => {
          setSyncStatus('idle')
        }, 5000)
      } else {
        setSyncStatus('error')
        setSyncError(data.details || data.error || 'Sync failed')
        console.error('Sync failed:', data.error)
      }
    } catch (error) {
      setSyncStatus('error')
      setSyncError(error instanceof Error ? error.message : 'Network error')
      console.error('Sync error:', error)
    }
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
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="max-w-5xl mx-auto p-8">
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
              {selectedDoc.markdown ? (
                <SOPRenderer content={selectedDoc.markdown} />
              ) : selectedDoc.content ? (
                <SOPRenderer content={selectedDoc.content} />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No content available</p>
                </div>
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
          <div className="relative">
            <Button
              variant={syncStatus === 'success' ? 'default' : syncStatus === 'error' ? 'destructive' : 'ghost'}
              size="sm"
              onClick={syncDocuments}
              disabled={syncStatus === 'syncing'}
              className={`flex items-center space-x-2 ${
                syncStatus === 'success' ? 'bg-green-600 hover:bg-green-700 text-white' :
                syncStatus === 'error' ? 'bg-red-600 hover:bg-red-700 text-white' : ''
              }`}
              title={syncStatus === 'error' && syncError ? syncError : undefined}
            >
              {syncStatus === 'syncing' && (
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              {syncStatus === 'success' && <CheckCircle className="w-4 h-4" />}
              {syncStatus === 'error' && <XCircle className="w-4 h-4" />}
              {syncStatus === 'idle' && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>
                {syncStatus === 'syncing' && 'Syncing...'}
                {syncStatus === 'success' && syncResult && `Synced ${syncResult.synced}${syncResult.updated > 0 ? `, updated ${syncResult.updated}` : ''}${syncResult.errors > 0 ? `, ${syncResult.errors} errors` : ''}`}
                {syncStatus === 'error' && 'Sync failed'}
                {syncStatus === 'idle' && 'Sync from Slite'}
              </span>
            </Button>

            {/* Error message tooltip */}
            {syncStatus === 'error' && syncError && (
              <div className="absolute top-full left-0 mt-1 p-2 bg-red-50 border border-red-200 rounded-md shadow-lg z-10 max-w-xs">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{syncError}</p>
                </div>
              </div>
            )}
          </div>
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