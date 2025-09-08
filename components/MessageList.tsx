"use client"

import * as React from "react"
import { Copy, User } from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn, copyToClipboard, formatRelativeTime } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { SourceList } from "./SourceList"
import { LoadingDots } from "./LoadingDots"

export interface Message {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
  sources?: string[]
}

interface MessageListProps {
  messages: Message[]
  isStreaming?: boolean
  streamingContent?: string
}

export function MessageList({
  messages,
  isStreaming = false,
  streamingContent = ""
}: MessageListProps) {
  const { toast } = useToast()
  const scrollAreaRef = React.useRef<HTMLDivElement>(null)
  const bottomRef = React.useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    const scrollToBottom = () => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "end",
          inline: "nearest" 
        })
      }
      
      // Direct scroll for native div
      if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
      }
    }
    
    // Use timeout to ensure DOM has updated
    const timeoutId = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timeoutId)
  }, [messages, streamingContent])

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content)
      toast({
        title: "Copied to clipboard",
        description: "Message content copied successfully.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy message to clipboard.",
        variant: "destructive",
      })
    }
  }

  const renderMessage = (message: Message) => {
    const isUser = message.role === "user"
    const isSystem = message.role === "system"
    
    if (isSystem) return null // Don't render system messages

    return (
      <div
        key={message.id}
        className={cn(
          "group flex items-start space-x-3 p-6",
          isUser ? "bg-gray-50" : "bg-white"
        )}
      >
        <Avatar className="h-8 w-8 shrink-0">
          {isUser ? (
            <AvatarFallback>
              <User className="h-4 w-4" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="p-1">
              <img 
                src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" 
                alt="SOP Assistant"
                className="w-full h-full object-contain"
              />
            </AvatarFallback>
          )}
        </Avatar>
        
        <div className="flex-1 space-y-2 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">
              {isUser ? "You" : "Assistant"}
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(message.createdAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => handleCopy(message.content)}
              >
                <Copy className="h-3 w-3" />
                <span className="sr-only">Copy message</span>
              </Button>
            </div>
          </div>
          
          <div className="prose prose-sm max-w-none dark:prose-invert">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ node, inline, className, children, ...props }: any) => {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <div className="relative">
                        <pre className="bg-muted border rounded-lg p-4 overflow-x-auto">
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => handleCopy(String(children).replace(/\n$/, ''))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
          
          {message.sources && message.sources.length > 0 && (
            <SourceList sources={message.sources} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollAreaRef} className="flex-1 bg-white h-full overflow-y-auto overflow-x-hidden">
      <div className="space-y-4 bg-white p-4">
        {messages
          .filter(m => m.role !== "system")
          .map((message) => renderMessage(message))}
        
        {isStreaming && (
          <div className="group flex items-start space-x-3 p-6 bg-white">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="p-1">
                <img 
                  src="https://assets.agentfire3.com/uploads/sites/1849/2024/10/favicon.png" 
                  alt="SOP Assistant"
                  className="w-full h-full object-contain"
                />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-2 overflow-hidden">
              <div className="text-sm font-medium">Assistant</div>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                {streamingContent ? (
                  <>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamingContent}
                    </ReactMarkdown>
                    <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                  </>
                ) : (
                  <LoadingDots text="Searching documentation" />
                )}
              </div>
            </div>
          </div>
        )}
        
        <div ref={bottomRef} className="h-4" />
      </div>
    </div>
  )
}