"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, copyToClipboard, formatRelativeTime } from "@/lib/utils"

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
}

type Props = {
  messages: Message[]
  isStreaming?: boolean
  streamingContent?: string
  userImage?: string
  userName?: string
}

function Bubble({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <div className={cn("flex", align === "right" ? "justify-end" : "justify-start")}>
      <div className="max-w-[70ch] rounded-2xl px-3 py-2 bg-white/80 dark:bg-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  )
}

export default function MessageList({
  messages,
  isStreaming = false,
  streamingContent = "",
  userImage,
  userName = "You",
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content)
    } catch {}
  }

  return (
    <div className="space-y-4">
      {messages
        .filter((m) => m.role !== "system")
        .map((m) => {
          const isUser = m.role === "user"
          return (
            <div key={m.id} className="group grid grid-cols-[32px,1fr] gap-3">
              <div className="mt-1">
                <Avatar className="h-8 w-8">
                  {isUser ? (
                    <>
                      <AvatarImage src={userImage} alt={userName} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              <div className="space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{isUser ? userName : "Assistant"}</div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(m.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(m.content)}
                      title="Copy message"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Bubble align={isUser ? "right" : "left"}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  )}
                </Bubble>
              </div>
            </div>
          )
        })}

      {/* streaming assistant bubble */}
      {isStreaming && streamingContent && (
        <div className="grid grid-cols-[32px,1fr] gap-3">
          <div className="mt-1">
            <Av

mkdir -p components

cat > components/MessageList.tsx <<'EOF'
"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Copy, User, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, copyToClipboard, formatRelativeTime } from "@/lib/utils"

export type Message = {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  createdAt: Date
}

type Props = {
  messages: Message[]
  isStreaming?: boolean
  streamingContent?: string
  userImage?: string
  userName?: string
}

function Bubble({
  children,
  align = "left",
}: {
  children: React.ReactNode
  align?: "left" | "right"
}) {
  return (
    <div className={cn("flex", align === "right" ? "justify-end" : "justify-start")}>
      <div className="max-w-[70ch] rounded-2xl px-3 py-2 bg-white/80 dark:bg-zinc-800 shadow-sm">
        {children}
      </div>
    </div>
  )
}

export default function MessageList({
  messages,
  isStreaming = false,
  streamingContent = "",
  userImage,
  userName = "You",
}: Props) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingContent])

  const handleCopy = async (content: string) => {
    try {
      await copyToClipboard(content)
    } catch {}
  }

  return (
    <div className="space-y-4">
      {messages
        .filter((m) => m.role !== "system")
        .map((m) => {
          const isUser = m.role === "user"
          return (
            <div key={m.id} className="group grid grid-cols-[32px,1fr] gap-3">
              <div className="mt-1">
                <Avatar className="h-8 w-8">
                  {isUser ? (
                    <>
                      <AvatarImage src={userImage} alt={userName} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>

              <div className="space-y-2 overflow-hidden">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{isUser ? userName : "Assistant"}</div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(m.createdAt)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleCopy(m.content)}
                      title="Copy message"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <Bubble align={isUser ? "right" : "left"}>
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  )}
                </Bubble>
              </div>
            </div>
          )
        })}

      {/* streaming assistant bubble */}
      {isStreaming && streamingContent && (
        <div className="grid grid-cols-[32px,1fr] gap-3">
          <div className="mt-1">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
          </div>
          <Bubble>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingContent}</ReactMarkdown>
          </Bubble>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
