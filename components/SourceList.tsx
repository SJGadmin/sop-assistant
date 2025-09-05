"use client"

import * as React from "react"
import { FileText } from "lucide-react"
import { cn } from "@/lib/utils"

interface SourceListProps {
  sources: string[]
  className?: string
}

export function SourceList({ sources, className }: SourceListProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className={cn("mt-3 pt-2 border-t border-border/50", className)}>
      <div className="flex items-start space-x-2 text-xs text-muted-foreground">
        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium">Sources:</span>{" "}
          {sources.map((source, index) => (
            <React.Fragment key={source}>
              <span className="hover:text-foreground transition-colors cursor-default">
                {source}
              </span>
              {index < sources.length - 1 && ", "}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}