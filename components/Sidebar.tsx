"use client"

import * as React from "react"
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  MoreHorizontal,
  Settings,
  LogOut
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn, formatRelativeTime } from "@/lib/utils"
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
  className?: string
}

export function Sidebar({
  chats,
  currentChatId,
  onChatSelect,
  onNewChat,
  onDeleteChat,
  className
}: SidebarProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await onDeleteChat(chatId)
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

  const handleSignOut = () => {
    signOut({ callbackUrl: '/signin' })
  }

  const handleIngestClick = async () => {
    try {
      const response = await fetch('/api/ingest', {
        method: 'POST',
      })
      
      if (response.ok) {
        const result = await response.json()
        toast({
          title: "Ingestion started",
          description: `Processing ${result.message || 'documents'}...`,
        })
      } else {
        throw new Error('Failed to start ingestion')
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start document ingestion.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className={cn("flex h-full w-64 flex-col border-r bg-muted/50", className)}>
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4 border-b">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 rounded bg-primary" />
          <span className="font-semibold text-sm">SOP Assistant</span>
        </div>
        <ThemeToggle />
      </div>

      {/* New Chat Button */}
      <div className="p-4">
        <Button onClick={onNewChat} className="w-full justify-start" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group flex items-center space-x-2 rounded-lg px-3 py-2 text-sm hover:bg-accent cursor-pointer",
                currentChatId === chat.id && "bg-accent"
              )}
              onClick={() => onChatSelect(chat.id)}
            >
              <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 truncate">
                <div className="truncate font-medium">{chat.title}</div>
                <div className="text-xs text-muted-foreground">
                  {formatRelativeTime(chat.updatedAt)}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={(e) => handleDeleteChat(chat.id, e)}
              >
                <Trash2 className="h-3 w-3" />
                <span className="sr-only">Delete chat</span>
              </Button>
            </div>
          ))}
          
          {chats.length === 0 && (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No chats yet. Start a new conversation!
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 h-auto">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarImage src={session?.user?.image || ''} alt={session?.user?.name || ''} />
                <AvatarFallback className="text-xs">
                  {session?.user?.name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium truncate">
                  {session?.user?.name || 'User'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {session?.user?.email}
                </div>
              </div>
              <MoreHorizontal className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleIngestClick}>
              <Settings className="mr-2 h-4 w-4" />
              Refresh Documents
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}