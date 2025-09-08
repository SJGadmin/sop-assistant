"use client"

import * as React from "react"
import { Send, Square } from "lucide-react"

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  disabled?: boolean
  isStreaming?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  isStreaming = false,
  placeholder = "Ask about SOPs, procedures, or policies..."
}: ChatInputProps) {
  const [message, setMessage] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = () => {
    if (message.trim() && !disabled && !isStreaming) {
      onSend(message.trim())
      setMessage("")
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto"
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize textarea
    const textarea = e.target
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
  }

  const handleStop = () => {
    if (onStop) {
      onStop()
    }
  }

  React.useEffect(() => {
    // Focus textarea when component mounts
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  return (
    <div className="border-t border-gray-200 bg-white p-4 md:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="relative">
          <div className="relative flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className="w-full min-h-[56px] max-h-[200px] resize-none pr-12 py-4 px-4 border-2 border-gray-300 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 transition-all duration-200"
                rows={1}
              />
              <div className="absolute bottom-2 right-2">
                {isStreaming ? (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="h-10 w-10 p-0 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center"
                  >
                    <Square className="h-4 w-4" />
                    <span className="sr-only">Stop generating</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled || !message.trim()}
                    className="h-10 w-10 p-0 rounded-full bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white flex items-center justify-center"
                  >
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send message</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-500">
          <span>Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Enter</kbd> to send</span>
          <span>•</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs font-mono">Shift + Enter</kbd> for new line</span>
        </div>
      </div>
    </div>
  )
}