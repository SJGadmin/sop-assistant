"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/RichTextEditor"
import {
  FileText,
  Plus,
  Edit,
  Trash2,
  ArrowLeft,
  Save,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  Archive,
  AlertCircle,
} from "lucide-react"

interface Document {
  id: string
  title: string
  markdown?: string
  content?: string
  status: 'DRAFT' | 'PROCESSING' | 'PUBLISHED' | 'ARCHIVED'
  publishedAt?: string
  createdAt: string
  updatedAt: string
  _count?: { chunks: number }
}

type ViewMode = 'list' | 'edit' | 'create'

const statusConfig = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: Clock },
  PROCESSING: { label: 'Processing', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  PUBLISHED: { label: 'Published', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  ARCHIVED: { label: 'Archived', color: 'bg-red-100 text-red-700', icon: Archive },
}

export default function AdminPage() {
  const [documents, setDocuments] = React.useState<Document[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewMode, setViewMode] = React.useState<ViewMode>('list')
  const [editingDoc, setEditingDoc] = React.useState<Document | null>(null)
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [saving, setSaving] = React.useState(false)
  const [publishing, setPublishing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = async () => {
    try {
      const response = await fetch('/api/admin/documents')
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    }
    setLoading(false)
  }

  const handleCreate = () => {
    setTitle('')
    setContent('')
    setEditingDoc(null)
    setError(null)
    setViewMode('create')
  }

  const handleEdit = async (doc: Document) => {
    setError(null)
    try {
      const response = await fetch(`/api/admin/documents/${doc.id}`)
      if (response.ok) {
        const data = await response.json()
        setEditingDoc(data.document)
        setTitle(data.document.title)
        setContent(data.document.markdown || data.document.content || '')
        setViewMode('edit')
      }
    } catch (error) {
      console.error('Failed to load document:', error)
      setError('Failed to load document')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/documents/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setDocuments(prev => prev.filter(d => d.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete document:', error)
      setError('Failed to delete document')
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      if (viewMode === 'create') {
        const response = await fetch('/api/admin/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, markdown: content }),
        })

        if (response.ok) {
          const data = await response.json()
          setDocuments(prev => [data.document, ...prev])
          setEditingDoc(data.document)
          setViewMode('edit')
        } else {
          throw new Error('Failed to create document')
        }
      } else if (editingDoc) {
        const response = await fetch(`/api/admin/documents/${editingDoc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, markdown: content }),
        })

        if (response.ok) {
          const data = await response.json()
          setEditingDoc(data.document)
          setDocuments(prev => prev.map(d => d.id === data.document.id ? data.document : d))
        } else {
          throw new Error('Failed to save document')
        }
      }
    } catch (error) {
      console.error('Save error:', error)
      setError('Failed to save document')
    }

    setSaving(false)
  }

  const handlePublish = async () => {
    if (!editingDoc) return

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    setPublishing(true)
    setError(null)

    try {
      // Save first
      await fetch(`/api/admin/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, markdown: content }),
      })

      // Then publish
      const response = await fetch(`/api/admin/documents/${editingDoc.id}/publish`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setEditingDoc(data.document)
        setDocuments(prev => prev.map(d => d.id === data.document.id ? { ...d, ...data.document } : d))
        alert(`Document published successfully! Created ${data.chunksCreated} searchable chunks.`)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.details || errorData.error || 'Failed to publish')
      }
    } catch (error) {
      console.error('Publish error:', error)
      setError(error instanceof Error ? error.message : 'Failed to publish document')
    }

    setPublishing(false)
  }

  const handleCancel = () => {
    setViewMode('list')
    setEditingDoc(null)
    setTitle('')
    setContent('')
    setError(null)
  }

  // Editor View
  if (viewMode === 'edit' || viewMode === 'create') {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Documents</span>
            </Button>
            <div>
              <h1 className="text-lg font-semibold">
                {viewMode === 'create' ? 'Create New Document' : 'Edit Document'}
              </h1>
              {editingDoc && (
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${statusConfig[editingDoc.status].color}`}>
                    {statusConfig[editingDoc.status].label}
                  </span>
                  {editingDoc._count && (
                    <span>{editingDoc._count.chunks} chunks</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving || publishing}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Draft
            </Button>
            {(viewMode === 'edit' || editingDoc) && (
              <Button
                size="sm"
                onClick={handlePublish}
                disabled={saving || publishing}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              &times;
            </button>
          </div>
        )}

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Document Title
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter document title..."
                className="text-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content
              </label>
              <RichTextEditor
                content={content}
                onChange={setContent}
                placeholder="Start writing your SOP..."
              />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // List View
  return (
    <div className="min-h-screen bg-white flex flex-col">
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
            <h1 className="text-xl font-bold">Document Management</h1>
            <p className="text-sm text-gray-600">Create and manage SOP documents</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={handleCreate} className="flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Create Document</span>
          </Button>
          <Link href="/docs">
            <Button variant="outline" size="sm">
              View Public Docs
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" size="sm">
              Back to Chat
            </Button>
          </Link>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            &times;
          </button>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : documents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FileText className="h-16 w-16 mb-4" />
            <p className="text-lg mb-2">No documents yet</p>
            <p className="text-sm mb-4">Create your first SOP document to get started</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create Document
            </Button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Title</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Chunks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Updated</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => {
                  const StatusIcon = statusConfig[doc.status].icon
                  return (
                    <tr key={doc.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-blue-500" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${statusConfig[doc.status].color}`}>
                          <StatusIcon className={`h-3 w-3 ${doc.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                          <span>{statusConfig[doc.status].label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {doc._count?.chunks || 0}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(doc.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(doc)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
