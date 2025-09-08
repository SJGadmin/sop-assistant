"use client"

import * as React from "react"
import { Sidebar, type Chat } from "@/components/Sidebar"
import { MessageList, type Message } from "@/components/MessageList"
import { ChatInput } from "@/components/ChatInput"
import { useToast } from "@/hooks/use-toast"
import { generateChatTitle } from "@/lib/utils"

export default function HomePage() {
  const { toast } = useToast()

  const [chats, setChats] = React.useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = React.useState<string>()
  const [messages, setMessages] = React.useState<Message[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const [streamingContent, setStreamingContent] = React.useState("")
  const [abortController, setAbortController] = React.useState<AbortController>()

  // Load chats on mount
  React.useEffect(() => {
    loadChats()
  }, [])

  // Load messages when chat changes
  React.useEffect(() => {
    if (currentChatId) {
      loadMessages(currentChatId)
    } else {
      setMessages([])
    }
  }, [currentChatId])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handleNewChat()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadChats = async () => {
    try {
      const response = await fetch('/api/chats')
      if (response.ok) {
        const data = await response.json()
        // Convert string dates to Date objects
        const chatsWithDates = (data.chats || []).map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
          updatedAt: new Date(chat.updatedAt),
        }))
        setChats(chatsWithDates)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load chats",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  const loadMessages = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`)
      if (response.ok) {
        const data = await response.json()
        // Convert string dates to Date objects
        const messagesWithDates = (data.messages || []).map((message: any) => ({
          ...message,
          createdAt: new Date(message.createdAt),
        }))
        setMessages(messagesWithDates)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      })
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        const newChat: Chat = {
          id: data.chatId,
          title: "New Chat",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        
        setChats(prev => [newChat, ...prev])
        setCurrentChatId(data.chatId)
        setMessages([])
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      })
    }
  }

  const handleChatSelect = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const handleDeleteChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setChats(prev => prev.filter(chat => chat.id !== chatId))
        if (currentChatId === chatId) {
          setCurrentChatId(undefined)
          setMessages([])
        }
      }
    } catch (error) {
      throw error // Re-throw to be caught by Sidebar component
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Create or get current chat
    let chatId = currentChatId
    if (!chatId) {
      try {
        const response = await fetch('/api/chats', {
          method: 'POST',
        })
        
        if (response.ok) {
          const data = await response.json()
          chatId = data.chatId
          
          const newChat: Chat = {
            id: data.chatId, // Use data.chatId directly since we know it exists
            title: generateChatTitle(content),
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          setChats(prev => [newChat, ...prev])
          setCurrentChatId(data.chatId)
        } else {
          throw new Error('Failed to create chat')
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create chat",
          variant: "destructive",
        })
        return
      }
    }

    // At this point chatId is guaranteed to be a string
    if (!chatId) return

    // Add user message immediately
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date(),
    }
    
    setMessages(prev => [...prev, userMessage])
    setIsStreaming(true)
    setStreamingContent("")

    // Create abort controller for this request
    const controller = new AbortController()
    setAbortController(controller)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatId,
          message: content,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      let assistantContent = ""
      let messageCreated = false
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                break
              }
              
              if (data.length === 0) continue // Skip empty data
              
              try {
                const parsed = JSON.parse(data)
                
                // Handle content chunks
                if (parsed.content && typeof parsed.content === 'string') {
                  assistantContent += parsed.content
                  setStreamingContent(assistantContent)
                }
                
                // Handle final message with sources
                if (parsed.sources && !messageCreated) {
                  const finalMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: assistantContent,
                    sources: parsed.sources,
                    createdAt: new Date(),
                  }
                  
                  setMessages(prev => [...prev, finalMessage])
                  setStreamingContent("")
                  messageCreated = true
                  
                  // Update chat title if this is the first assistant message
                  if (messages.length === 1) {
                    setChats(prev => prev.map(chat => 
                      chat.id === chatId 
                        ? { ...chat, title: generateChatTitle(content), updatedAt: new Date() }
                        : chat
                    ))
                  }
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE data:', data, parseError)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
      
      // Create final message if we have content but haven't created one yet
      if (assistantContent.length > 0 && !messageCreated) {
        const finalMessage: Message = {
          id: `msg-${Date.now()}`,
          role: "assistant",
          content: assistantContent,
          createdAt: new Date(),
        }
        
        setMessages(prev => [...prev, finalMessage])
        setStreamingContent("")
        
        // Update chat title if this is the first assistant message
        if (messages.length === 1) {
          setChats(prev => prev.map(chat => 
            chat.id === chatId 
              ? { ...chat, title: generateChatTitle(content), updatedAt: new Date() }
              : chat
          ))
        }
      }
      
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was aborted
        setStreamingContent("")
      } else {
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        })
        setStreamingContent("")
      }
    }
    
    setIsStreaming(false)
    setAbortController(undefined)
  }

  const handleStopStreaming = () => {
    if (abortController) {
      abortController.abort()
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onChatSelect={handleChatSelect}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
      />
      
      <div className="flex flex-1 flex-col">
        {currentChatId ? (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center max-w-2xl px-8">
              <div className="mb-8">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl overflow-hidden">
                  <img 
                    src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" 
                    alt="Stewart & Jane Group"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">Welcome to SOP Assistant</h1>
                <p className="text-gray-600 text-lg">
                  Your AI-powered guide to Stewart & Jane Group's standard operating procedures, 
                  policies, and documentation.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h3 className="font-semibold mb-2 text-gray-900">📋 SOPs & Procedures</h3>
                  <p className="text-sm text-gray-600">Get instant answers about company procedures and workflows</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h3 className="font-semibold mb-2 text-gray-900">📚 Policy Questions</h3>
                  <p className="text-sm text-gray-600">Find information about company policies and guidelines</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h3 className="font-semibold mb-2 text-gray-900">🔍 Quick Search</h3>
                  <p className="text-sm text-gray-600">Search through all documentation with natural language</p>
                </div>
                <div className="p-6 border border-gray-200 rounded-xl bg-white shadow-sm">
                  <h3 className="font-semibold mb-2 text-gray-900">💡 Best Practices</h3>
                  <p className="text-sm text-gray-600">Learn recommended approaches and best practices</p>
                </div>
              </div>
              
              <div className="text-center">
                <p className="text-sm text-gray-500">
                  Start typing below or press <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">⌘K</kbd> to begin
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Always show chat input */}
        <ChatInput
          onSend={handleSendMessage}
          onStop={handleStopStreaming}
          isStreaming={isStreaming}
        />
      </div>
    </div>
  )
}