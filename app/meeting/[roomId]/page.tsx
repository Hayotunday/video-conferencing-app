"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import type { Call } from "@stream-io/video-react-sdk"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Global call cache to prevent multiple call creations
const callCache = new Map<string, Call>()

export default function MeetingPage() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.roomId as string
  const { user, loading: authLoading } = useAuth()
  const [streamClient, setStreamClient] = useState<any>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamLoading, setStreamLoading] = useState(true)
  const [call, setCall] = useState<Call | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const initializingRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    setMounted(true)
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  // Dynamically import and use the stream context
  useEffect(() => {
    if (!mounted || authLoading || !user) return

    const initializeStreamClient = async () => {
      try {
        setStreamLoading(true)
        setStreamError(null)

        // Dynamically import the stream context
        const { useStreamClient } = await import("@/contexts/stream-context")

        // We need to access the context from within the provider
        // For now, let's redirect to dashboard and let it handle the stream initialization
        if (!streamClient) {
          router.push("/dashboard")
          return
        }
      } catch (error) {
        console.error("Error initializing stream:", error)
        setStreamError("Failed to initialize video service")
      } finally {
        setStreamLoading(false)
      }
    }

    initializeStreamClient()
  }, [mounted, authLoading, user, router, streamClient])

  const handleBackToDashboard = () => {
    router.push("/dashboard")
  }

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading meeting...</p>
        </div>
      </div>
    )
  }

  // Show loading while auth is loading
  if (authLoading || streamLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>{authLoading ? "Authenticating..." : "Initializing video service..."}</p>
          {roomId && <p className="text-sm text-gray-400 mt-2">Room: {roomId}</p>}
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push("/")
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <p>Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // For now, redirect to dashboard to ensure proper stream initialization
  return (
    <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            Initializing Meeting
          </CardTitle>
          <CardDescription>Setting up video service for the meeting</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">
            Please wait while we initialize the video service. You'll be redirected to the meeting room shortly.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleBackToDashboard} className="flex-1">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
