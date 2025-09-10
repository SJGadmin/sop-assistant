"use client"

import * as React from "react"
import { 
  Plus, 
  MessageSquare, 
  Trash2
} from "lucide-react"
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
      onDeleteChat(chatId)
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

      {/* See All Docs Button */}
      <div className="p-4 border-t border-gray-200">
        <a
          href="/docs"
          className="w-full flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          See All Docs
        </a>
      </div>

    </div>
  )
}