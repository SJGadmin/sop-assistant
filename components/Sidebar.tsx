"use client"

import * as React from "react"
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Settings
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { formatRelativeTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

export interface Chat {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface SidebarProps {
  chats: Chat[]
  currentChatId?: string
  onChatSelect: (chatId: string) => void
  onNewChat: () => void
  onDeleteChat: (chatId: string) => void
}

export function Sidebar({
  chats,
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat
}: SidebarProps) {
  const { toast } = useToast()

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await onDeleteChat(chatId)
      toast({
        title: "Chat deleted",
        description: "The chat has been deleted successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete chat. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Removed sign out functionality

  const handleIngestClick = async () => {
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Ingestion started",
          description: `Processing ${result.message || 'documents'}...`,
        })
      } else {
        throw new Error('Failed to start ingestion')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start document ingestion.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="flex h-full w-72 flex-col border-r border-gray-200 bg-gray-50">
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg overflow-hidden">
            <img 
              src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" 
              alt="Stewart & Jane Group"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="font-semibold text-gray-900">SOP Assistant</span>
        </div>
        <ThemeToggle />
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <button 
          onClick={onNewChat} 
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto px-3">
        <div className="space-y-2 pb-4">
          <div className="px-2 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent Chats
          </div>
          
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group flex items-center space-x-3 rounded-lg px-3 py-3 text-sm cursor-pointer transition-colors ${
                currentChatId === chat.id 
                  ? "bg-blue-50 border border-blue-200" 
                  : "hover:bg-gray-100"
              }`}
              onClick={() => onChatSelect(chat.id)}
            >
              <div className={`h-2 w-2 rounded-full shrink-0 ${
                currentChatId === chat.id ? "bg-blue-500" : "bg-gray-400"
              }`} />
              <div className="flex-1 truncate">
                <div className="truncate font-medium leading-tight text-gray-900">{chat.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {formatRelativeTime(chat.updatedAt)}
                </div>
              </div>
              <button
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 transition-all rounded flex items-center justify-center"
                onClick={(e) => handleDeleteChat(chat.id, e)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Delete chat</span>
              </button>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="px-3 py-8 text-center">
              <MessageSquare className="h-8 w-8 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-500">
                No chats yet
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Start a conversation to see your chat history
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Settings Menu */}
      <div className="border-t border-gray-200 bg-gray-100 p-4">
        <button 
          className="w-full flex items-center justify-start px-3 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          onClick={handleIngestClick}
        >
          <Settings className="mr-3 h-4 w-4" />
          <span className="text-sm">Refresh Documents</span>
        </button>
      </div>
    </div>
  )
}