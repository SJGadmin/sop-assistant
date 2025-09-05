"use client"

import { signIn, getSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function SignInClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error')

  useEffect(() => {
    // Check if user is already signed in
    getSession().then((session) => {
      if (session) {
        router.push(callbackUrl)
      }
    })

    // Show error message if sign in failed
    if (error) {
      let errorMessage = "An error occurred during sign in."
      
      switch (error) {
        case 'AccessDenied':
          errorMessage = "Access denied. Your email is not authorized to access this application."
          break
        case 'Configuration':
          errorMessage = "There is a problem with the server configuration."
          break
        case 'Verification':
          errorMessage = "The verification token has expired."
          break
        default:
          errorMessage = "An unexpected error occurred. Please try again."
      }
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [error, callbackUrl, router, toast])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('google', { callbackUrl })
    } catch (error) {
      toast({
        title: "Sign in failed",
        description: "Failed to initiate Google sign in. Please try again.",
        variant: "destructive",
      })
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-lg bg-primary flex items-center justify-center mb-4">
            <div className="h-6 w-6 rounded bg-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">SOP Assistant</CardTitle>
          <CardDescription>
            Sign in to access Stewart & Jane Group's Standard Operating Procedures
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            className="w-full" 
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? "Signing in..." : "Continue with Google"}
          </Button>
          
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Only authorized Stewart & Jane Group emails can access this application.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}