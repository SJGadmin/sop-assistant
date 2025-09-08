"use client"

interface LoadingDotsProps {
  text?: string
}

export function LoadingDots({ text = "Searching knowledge base" }: LoadingDotsProps) {
  return (
    <div className="flex items-center space-x-2 text-gray-500">
      <span className="text-sm">{text}</span>
      <div className="flex space-x-1">
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        ></div>
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        ></div>
        <div 
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        ></div>
      </div>
    </div>
  )
}