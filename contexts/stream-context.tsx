"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from "react"
import { StreamVideo, type StreamVideoClient, type User } from "@stream-io/video-react-sdk"
import { useAuth } from "./auth-context"
import { generateStreamToken } from "@/app/actions/stream"
import { createStreamClient } from "@/lib/stream"
import { doc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface StreamContextType {
  client: StreamVideoClient | undefined
  isLoading: boolean
  error: string | null
  retryConnection: () => void
  isReady: boolean
}

const StreamContext = createContext<StreamContextType | undefined>(undefined)

// Global client instance to prevent multiple initializations
let globalStreamClient: StreamVideoClient | undefined
let globalUserId: string | undefined
let initializationPromise: Promise<StreamVideoClient> | undefined

export function StreamProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [client, setClient] = useState<StreamVideoClient | undefined>(globalStreamClient)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [mounted, setMounted] = useState(false)
  const mountedRef = useRef(true)
  const initializingRef = useRef(false)

  useEffect(() => {
    setMounted(true)
    mountedRef.current = true

    return () => {
      mountedRef.current = false
    }
  }, [])

  const disconnectClient = useCallback(async () => {
    if (globalStreamClient) {
      try {
        await globalStreamClient.disconnectUser()
        globalStreamClient = undefined
        globalUserId = undefined
        initializationPromise = undefined
      } catch (error) {
        console.error("Error disconnecting client:", error)
      }
    }
  }, [])

  const getUserDisplayName = useCallback(
    async (userId: string) => {
      try {
        const docRef = doc(db, "users", userId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const userData = docSnap.data()
          return userData.displayName || user?.displayName || user?.email || "Anonymous"
        }
      } catch (error) {
        console.error("Error fetching user profile:", error)
      }
      return user?.displayName || user?.email || "Anonymous"
    },
    [user],
  )

  const initializeStream = useCallback(
    async (userId: string, userDisplayName: string, userEmail: string, userPhotoURL?: string) => {
      // Prevent multiple initializations
      if (initializingRef.current) return globalStreamClient

      // If we already have a client for this user, return it
      if (globalStreamClient && globalUserId === userId) {
        return globalStreamClient
      }

      // If there's already an initialization in progress for this user, wait for it
      if (initializationPromise && globalUserId === userId) {
        return initializationPromise
      }

      // Clean up any existing client for different user
      if (globalStreamClient && globalUserId !== userId) {
        await disconnectClient()
      }

      initializingRef.current = true

      // Create new initialization promise
      initializationPromise = (async () => {
        try {
          const { success, token, error: tokenError } = await generateStreamToken(userId)

          if (!success || !token) {
            throw new Error(tokenError || "Failed to generate token")
          }

          // Get the user's display name from Firestore
          const displayName = await getUserDisplayName(userId)

          const streamUser: User = {
            id: userId,
            name: displayName,
            image: userPhotoURL || undefined,
          }

          console.log("Creating Stream client with user:", streamUser)

          const streamClient = createStreamClient(streamUser, token)

          // Store globally
          globalStreamClient = streamClient
          globalUserId = userId

          return streamClient
        } catch (error) {
          // Clean up on error
          initializationPromise = undefined
          throw error
        } finally {
          initializingRef.current = false
        }
      })()

      return initializationPromise
    },
    [disconnectClient, getUserDisplayName, user?.uid],
  )

  const retryConnection = useCallback(() => {
    if (user && !isLoading && mounted && !initializingRef.current) {
      setError(null)
      // Clear global state to force re-initialization
      globalStreamClient = undefined
      globalUserId = undefined
      initializationPromise = undefined

      setIsLoading(true)
      initializeStream(user.uid, user.displayName || "", user.email || "", user.photoURL || undefined)
        .then((streamClient) => {
          if (mountedRef.current) {
            setClient(streamClient)
            setIsReady(true)
            setError(null)
          }
        })
        .catch((error) => {
          if (mountedRef.current) {
            console.error("Error retrying Stream connection:", error)
            setError(error instanceof Error ? error.message : "Failed to initialize video client")
            setIsReady(false)
          }
        })
        .finally(() => {
          if (mountedRef.current) {
            setIsLoading(false)
          }
        })
    }
  }, [user?.uid, isLoading, mounted, initializeStream])

  // Stable user ID reference
  const userId = user?.uid
  const userDisplayName = user?.displayName || ""
  const userEmail = user?.email || ""
  const userPhotoURL = user?.photoURL || ""

  useEffect(() => {
    if (!mounted || authLoading || initializingRef.current) return

    // If no user, clean up
    if (!userId) {
      if (globalStreamClient) {
        disconnectClient()
      }
      setClient(undefined)
      setError(null)
      setIsLoading(false)
      setIsReady(false)
      return
    }

    // If we already have a client for this user, use it
    if (globalStreamClient && globalUserId === userId) {
      setClient(globalStreamClient)
      setIsReady(true)
      setIsLoading(false)
      return
    }

    // Initialize for new user
    setIsLoading(true)
    setIsReady(false)

    initializeStream(userId, userDisplayName, userEmail, userPhotoURL)
      .then((streamClient) => {
        if (mountedRef.current) {
          setClient(streamClient)
          setIsReady(true)
          setError(null)
        }
      })
      .catch((error) => {
        if (mountedRef.current) {
          console.error("Error initializing Stream client:", error)
          setError(error instanceof Error ? error.message : "Failed to initialize video client")
          setIsReady(false)
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setIsLoading(false)
        }
      })
  }, [mounted, userId, authLoading, userDisplayName, userEmail, userPhotoURL, initializeStream, disconnectClient])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      client,
      isLoading,
      error,
      retryConnection,
      isReady,
    }),
    [client, isLoading, error, retryConnection, isReady],
  )

  if (!mounted) {
    return <div>{children}</div>
  }

  return (
    <StreamContext.Provider value={contextValue}>
      {client && isReady ? <StreamVideo client={client}>{children}</StreamVideo> : children}
    </StreamContext.Provider>
  )
}

export function useStreamClient() {
  const context = useContext(StreamContext)
  if (context === undefined) {
    throw new Error("useStreamClient must be used within a StreamProvider")
  }
  return context
}
