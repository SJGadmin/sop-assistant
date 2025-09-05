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
        setChats(data.chats || [])
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
        setMessages(data.messages || [])
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
      
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = new TextDecoder().decode(value)
          const lines = chunk.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                break
              }
              
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) {
                  assistantContent += parsed.content
                  setStreamingContent(assistantContent)
                } else if (parsed.sources) {
                  // Handle final message with sources
                  const finalMessage: Message = {
                    id: `msg-${Date.now()}`,
                    role: "assistant",
                    content: assistantContent,
                    sources: parsed.sources,
                    createdAt: new Date(),
                  }
                  
                  setMessages(prev => [...prev, finalMessage])
                  setStreamingContent("")
                  
                  // Update chat title if this is the first message
                  if (messages.length === 1) { // User message + this assistant message
                    setChats(prev => prev.map(chat => 
                      chat.id === chatId 
                        ? { ...chat, title: generateChatTitle(content), updatedAt: new Date() }
                        : chat
                    ))
                  }
                }
              } catch (parseError) {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
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
          <>
            <MessageList
              messages={messages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
            />
            <ChatInput
              onSend={handleSendMessage}
              onStop={handleStopStreaming}
              isStreaming={isStreaming}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-12 w-12 rounded-lg bg-primary mx-auto flex items-center justify-center">
                <div className="h-6 w-6 rounded bg-primary-foreground" />
              </div>
              <h1 className="text-2xl font-semibold">Welcome to SOP Assistant</h1>
              <p className="text-muted-foreground max-w-md">
                Ask questions about Stewart & Jane Group's standard operating procedures, 
                policies, and documentation.
              </p>
              <div className="text-sm text-muted-foreground">
                Press <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘K</kbd> to start a new chat
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}