"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { CheckCircle, Settings, Users } from "lucide-react"

interface SOPRendererProps {
  content: string
}

export function SOPRenderer({ content }: SOPRendererProps) {
  const customComponents = {
    // Custom heading renderer
    h1: ({ children, ...props }: any) => (
      <h1 className="text-2xl font-bold text-gray-900 mb-6 pb-2 border-b-2 border-gray-200" {...props}>
        {children}
      </h1>
    ),
    
    h2: ({ children, ...props }: any) => {
      const text = children?.toString().toLowerCase() || ""
      let icon = null
      let bgColor = "bg-gray-50"
      let iconColor = "text-gray-600"
      
      // Determine icon and colors based on heading content
      if (text.includes("purpose")) {
        icon = <CheckCircle className="h-5 w-5 text-green-600" />
        bgColor = "bg-green-50"
        iconColor = "text-green-600"
      } else if (text.includes("scope")) {
        icon = <CheckCircle className="h-5 w-5 text-green-600" />
        bgColor = "bg-green-50"
        iconColor = "text-green-600"
      } else if (text.includes("system")) {
        icon = <Settings className="h-5 w-5 text-blue-600" />
        bgColor = "bg-blue-50"
        iconColor = "text-blue-600"
      } else if (text.includes("responsibilit") || text.includes("process")) {
        icon = <Users className="h-5 w-5 text-purple-600" />
        bgColor = "bg-purple-50"
        iconColor = "text-purple-600"
      }

      return (
        <div className={`${bgColor} rounded-lg p-4 mb-6 border border-gray-200`}>
          <h2 className="flex items-center space-x-3 text-lg font-semibold text-gray-900 mb-3" {...props}>
            {icon}
            <span>{children}</span>
          </h2>
        </div>
      )
    },

    h3: ({ children, ...props }: any) => (
      <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-4" {...props}>
        {children}
      </h3>
    ),

    // Custom paragraph renderer
    p: ({ children, ...props }: any) => (
      <p className="text-gray-700 leading-relaxed mb-4" {...props}>
        {children}
      </p>
    ),

    // Custom list renderers
    ul: ({ children, ...props }: any) => (
      <ul className="list-disc list-inside space-y-2 mb-4 ml-4" {...props}>
        {children}
      </ul>
    ),

    ol: ({ children, ...props }: any) => (
      <ol className="list-decimal list-inside space-y-2 mb-4 ml-4" {...props}>
        {children}
      </ol>
    ),

    li: ({ children, ...props }: any) => (
      <li className="text-gray-700 leading-relaxed" {...props}>
        {children}
      </li>
    ),

    // Custom link renderer
    a: ({ children, href, ...props }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:text-blue-800 underline"
        {...props}
      >
        {children}
      </a>
    ),

    // Custom blockquote renderer
    blockquote: ({ children, ...props }: any) => (
      <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-4" {...props}>
        {children}
      </blockquote>
    ),

    // Custom code renderer
    code: ({ children, className, ...props }: any) => {
      const isInline = !className
      if (isInline) {
        return (
          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
            {children}
          </code>
        )
      }
      return (
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
          <code className="text-sm font-mono text-gray-800" {...props}>
            {children}
          </code>
        </pre>
      )
    },

    // Custom table renderer
    table: ({ children, ...props }: any) => (
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border border-gray-200 rounded-lg" {...props}>
          {children}
        </table>
      </div>
    ),

    thead: ({ children, ...props }: any) => (
      <thead className="bg-gray-50" {...props}>
        {children}
      </thead>
    ),

    th: ({ children, ...props }: any) => (
      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b border-gray-200" {...props}>
        {children}
      </th>
    ),

    td: ({ children, ...props }: any) => (
      <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200" {...props}>
        {children}
      </td>
    ),

    // Custom strong/bold renderer
    strong: ({ children, ...props }: any) => (
      <strong className="font-semibold text-gray-900" {...props}>
        {children}
      </strong>
    ),

    // Custom emphasis/italic renderer
    em: ({ children, ...props }: any) => (
      <em className="italic text-gray-700" {...props}>
        {children}
      </em>
    ),
  }

  return (
    <div className="sop-content">
      <ReactMarkdown components={customComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}