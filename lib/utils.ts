import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  let dateObj: Date
  
  try {
    dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date"
    }
  } catch (error) {
    console.warn('Failed to format date:', date, error)
    return "Invalid date"
  }
  
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(dateObj)
}

export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) {
    return "Unknown"
  }

  const now = new Date()
  let dateObj: Date
  
  try {
    dateObj = typeof date === 'string' ? new Date(date) : date
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return "Invalid date"
    }
  } catch (error) {
    console.warn('Failed to parse date:', date, error)
    return "Invalid date"
  }
  
  const diffInMs = now.getTime() - dateObj.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  const diffInDays = diffInHours / 24

  if (diffInHours < 1) {
    return "Just now"
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInDays < 7) {
    return `${Math.floor(diffInDays)}d ago`
  } else {
    return formatDate(dateObj)
  }
}

export function generateChatTitle(message: string): string {
  // Get first line of the message
  const firstLine = message.split('\n')[0].trim()
  
  // If it's short enough, use it as is
  if (firstLine.length <= 50) {
    return firstLine
  }
  
  // Otherwise, create a 5-word summary
  const words = firstLine.split(' ')
  if (words.length <= 5) {
    return firstLine
  }
  
  return words.slice(0, 5).join(' ') + '...'
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text)
  }
  
  // Fallback for browsers without clipboard API
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      textArea.remove()
      resolve()
    } catch (err) {
      textArea.remove()
      reject(err)
    }
  })
}