"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useStreamClient } from "@/contexts/stream-context"
import { useAuth } from "@/contexts/auth-context"
import { VideoCall } from "@/components/video-call"
import type { Call } from "@stream-io/video-react-sdk"
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

// Global call cache to prevent multiple call creations
const callCache = new Map<string, Call>()
const callStateCache = new Map<string, { isJoined: boolean; hasLeft: boolean }>()

interface MeetingWrapperProps {
  roomId: string
  onLeave?: () => void
}

export function MeetingWrapper({ roomId, onLeave }: MeetingWrapperProps) {
  const router = useRouter()
  const { user } = useAuth()
  const { client, isLoading: streamLoading, error: streamError, retryConnection, isReady } = useStreamClient()
  const [call, setCall] = useState<Call | null>(null)
  const [callError, setCallError] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isJoiningCall, setIsJoiningCall] = useState(false)
  const [mounted, setMounted] = useState(false)
  const initializingRef = useRef(false)
  const mountedRef = useRef(true)

  // Stable references
  const userId = user?.uid

  useEffect(() => {
    setMounted(true)
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const leaveCall = useCallback(async (callInstance: Call, cacheKey: string) => {
    const callState = callStateCache.get(cacheKey)

    // Check if call has already been left
    if (callState?.hasLeft) {
      console.log("Call already left, skipping...")
      return
    }

    try {
      console.log("Leaving call...")

      // Mark as left before attempting to leave
      callStateCache.set(cacheKey, {
        isJoined: false,
        hasLeft: true,
      })

      // Only leave if the call is actually joined
      if (callState?.isJoined) {
        await callInstance.leave()
        console.log("Successfully left call")
      }
    } catch (error: any) {
      console.error("Error leaving call:", error)

      // If the error is about already leaving, that's fine
      if (!error.message?.includes("already been left")) {
        // Reset the state if it's a different error
        callStateCache.set(cacheKey, {
          isJoined: false,
          hasLeft: false,
        })
      }
    }
  }, [])

  const joinCall = useCallback(
    async (callInstance: Call, cacheKey: string) => {
      const callState = callStateCache.get(cacheKey)

      // Check if call is already joined
      if (callState?.isJoined || isJoiningCall) {
        console.log("Call already joined or joining in progress")
        return
      }

      setIsJoiningCall(true)
      try {
        console.log("Joining call...")

        // Enable camera and microphone by default when joining
        await callInstance.camera.enable()
        await callInstance.microphone.enable()

        await callInstance.join()

        // Mark as joined
        callStateCache.set(cacheKey, {
          isJoined: true,
          hasLeft: false,
        })

        console.log("Successfully joined call with camera and microphone enabled")
      } catch (error: any) {
        console.error("Error joining call:", error)
        if (mountedRef.current) {
          setCallError("Failed to join the call. Please try again.")
        }
      } finally {
        if (mountedRef.current) {
          setIsJoiningCall(false)
        }
      }
    },
    [isJoiningCall],
  )

  const initCall = useCallback(async () => {
    if (!client || !roomId || !userId || !isReady || initializingRef.current || !mounted) return

    const cacheKey = `${userId}-${roomId}`

    // Check if we already have this call cached
    const cachedCall = callCache.get(cacheKey)

    if (cachedCall) {
      console.log("Using cached call for room:", roomId)
      if (mountedRef.current) {
        setCall(cachedCall)
        // Only join if not already joined
        const callState = callStateCache.get(cacheKey)
        if (!callState?.isJoined && !callState?.hasLeft) {
          joinCall(cachedCall, cacheKey)
        }
      }
      return
    }

    initializingRef.current = true
    if (mountedRef.current) {
      setIsInitializing(true)
      setCallError(null)
    }

    try {
      console.log("Creating new call for room:", roomId)
      const newCall = client.call("default", roomId)

      // Use getOrCreate with minimal options to reduce API calls
      await newCall.getOrCreate({
        data: {
          created_by_id: userId,
        },
      })

      // Cache the call and initialize state
      callCache.set(cacheKey, newCall)
      callStateCache.set(cacheKey, {
        isJoined: false,
        hasLeft: false,
      })

      if (mountedRef.current) {
        setCall(newCall)
        // Join the new call
        joinCall(newCall, cacheKey)
      }
    } catch (error: any) {
      console.error("Error creating call:", error)

      if (mountedRef.current) {
        let errorMessage = "Failed to create call"

        if (
          error?.status === 429 ||
          error?.message?.includes("rate") ||
          error?.message?.includes("Too many requests")
        ) {
          errorMessage = "Too many requests. Please wait a moment before trying again."
        } else if (error?.message) {
          errorMessage = error.message
        }

        setCallError(errorMessage)
      }
    } finally {
      if (mountedRef.current) {
        setIsInitializing(false)
      }
      initializingRef.current = false
    }
  }, [client, roomId, userId, isReady, mounted, joinCall])

  useEffect(() => {
    if (mounted && isReady && client && userId) {
      initCall()
    }
  }, [mounted, isReady, client, userId, initCall])

  // Cleanup call when component unmounts
  useEffect(() => {
    return () => {
      if (call && userId && mountedRef.current) {
        const cacheKey = `${userId}-${roomId}`
        // Leave the call when component unmounts
        leaveCall(call, cacheKey)
      }
    }
  }, [call, userId, roomId, leaveCall])

  const handleLeaveCall = useCallback(() => {
    if (call && userId) {
      const cacheKey = `${userId}-${roomId}`

      // Leave the call and clean up
      leaveCall(call, cacheKey).then(() => {
        // Clear the call from cache after leaving
        callCache.delete(cacheKey)
        callStateCache.delete(cacheKey)

        // Call the onLeave callback or navigate to dashboard
        if (onLeave) {
          onLeave()
        } else {
          router.push("/dashboard")
        }
      })
    } else {
      // If no call, just navigate
      if (onLeave) {
        onLeave()
      } else {
        router.push("/dashboard")
      }
    }
  }, [call, userId, roomId, leaveCall, onLeave, router])

  const handleRetry = useCallback(() => {
    if (mountedRef.current) {
      setCallError(null)
      initCall()
    }
  }, [initCall])

  const handleRetryStream = useCallback(() => {
    retryConnection()
  }, [retryConnection])

  const handleBackToDashboard = useCallback(() => {
    if (onLeave) {
      onLeave()
    } else {
      router.push("/dashboard")
    }
  }, [onLeave, router])

  // Memoized error state
  const errorState = useMemo(() => {
    if (streamError) {
      return {
        type: "stream",
        isRateLimit: streamError.includes("rate") || streamError.includes("429"),
        message: streamError,
      }
    }
    if (callError) {
      return {
        type: "call",
        isRateLimit: callError.includes("rate") || callError.includes("Too many requests"),
        message: callError,
      }
    }
    return null
  }, [streamError, callError])

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

  // Show loading while stream is loading or call is being initialized/joined
  if (streamLoading || isInitializing || isJoiningCall) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>
            {streamLoading
              ? "Initializing video service..."
              : isInitializing
                ? "Creating meeting room..."
                : "Joining meeting..."}
          </p>
          {roomId && <p className="text-sm text-gray-400 mt-2">Meeting ID: {roomId}</p>}
        </div>
      </div>
    )
  }

  // Show error if there's an error
  if (errorState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorState.isRateLimit
                ? "Rate Limited"
                : errorState.type === "stream"
                  ? "Connection Error"
                  : "Meeting Error"}
            </CardTitle>
            <CardDescription>
              {errorState.isRateLimit
                ? "Too many requests"
                : errorState.type === "stream"
                  ? "Failed to initialize video service"
                  : "Failed to join the meeting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{errorState.message}</p>
            {errorState.isRateLimit && (
              <p className="text-xs text-orange-600">
                Please wait a moment before trying again. This helps ensure stable connections for all users.
              </p>
            )}
            <div className="flex gap-2">
              <Button onClick={errorState.type === "stream" ? handleRetryStream : handleRetry} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button variant="outline" onClick={handleBackToDashboard} className="flex-1">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading while call is being created
  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Setting up meeting room...</p>
          <p className="text-sm text-gray-400 mt-2">Meeting ID: {roomId}</p>
        </div>
      </div>
    )
  }

  return <VideoCall call={call} onLeave={handleLeaveCall} />
}
