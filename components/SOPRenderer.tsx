"use client"

import * as React from "react"
import { CheckCircle, Settings, Users } from "lucide-react"

interface SOPRendererProps {
  content: string
}

export function SOPRenderer({ content }: SOPRendererProps) {
  // Check if content is HTML (starts with < tag) or markdown
  const isHTML = content.trim().startsWith('<')
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

  // If content is HTML, render it directly with proper styling
  if (isHTML) {
    return (
      <>
        <div
          className="sop-content prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
        <style jsx global>{`
          .sop-content {
            color: #374151;
            line-height: 1.75;
          }

          .sop-content h1 {
            font-size: 2em;
            font-weight: bold;
            color: #111827;
            margin-top: 1em;
            margin-bottom: 0.5em;
            padding-bottom: 0.5em;
            border-bottom: 2px solid #e5e7eb;
          }

          .sop-content h2 {
            font-size: 1.5em;
            font-weight: bold;
            color: #111827;
            margin-top: 1.5em;
            margin-bottom: 0.75em;
          }

          .sop-content h3 {
            font-size: 1.25em;
            font-weight: 600;
            color: #1f2937;
            margin-top: 1.25em;
            margin-bottom: 0.5em;
          }

          .sop-content p {
            margin-bottom: 1em;
            color: #4b5563;
          }

          .sop-content ul,
          .sop-content ol {
            margin: 1em 0;
            padding-left: 1.5em;
          }

          .sop-content li {
            margin: 0.5em 0;
            color: #4b5563;
          }

          .sop-content ul {
            list-style-type: disc;
          }

          .sop-content ol {
            list-style-type: decimal;
          }

          .sop-content li > p {
            margin: 0.25em 0;
          }

          .sop-content strong {
            font-weight: 600;
            color: #111827;
          }

          .sop-content em {
            font-style: italic;
          }

          .sop-content a {
            color: #2563eb;
            text-decoration: underline;
          }

          .sop-content a:hover {
            color: #1d4ed8;
          }

          .sop-content blockquote {
            border-left: 4px solid #e5e7eb;
            padding-left: 1em;
            margin: 1em 0;
            color: #6b7280;
            font-style: italic;
          }

          .sop-content code {
            background-color: #f3f4f6;
            padding: 0.2em 0.4em;
            border-radius: 0.25em;
            font-family: ui-monospace, monospace;
            font-size: 0.9em;
          }

          .sop-content pre {
            background-color: #f3f4f6;
            padding: 1em;
            border-radius: 0.5em;
            overflow-x: auto;
            margin: 1em 0;
          }

          .sop-content pre code {
            background: none;
            padding: 0;
          }

          .sop-content hr {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 2em 0;
          }

          .sop-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 1em 0;
          }

          .sop-content th,
          .sop-content td {
            border: 1px solid #e5e7eb;
            padding: 0.5em 1em;
            text-align: left;
          }

          .sop-content th {
            background-color: #f9fafb;
            font-weight: 600;
          }

          .sop-content br {
            display: block;
            margin: 0.5em 0;
            content: "";
          }
        `}</style>
      </>
    )
  }

  // Otherwise, render as markdown
  const ReactMarkdown = require('react-markdown').default

  return (
    <div className="sop-content">
      <ReactMarkdown components={customComponents}>
        {content}
      </ReactMarkdown>
    </div>
  )
}