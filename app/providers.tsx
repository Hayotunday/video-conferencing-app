"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AuthProvider } from "@/contexts/auth-context"
import { StreamProvider } from "@/contexts/stream-context"
import { Toaster } from "@/components/ui/toaster"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading application...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <StreamProvider>
        {children}
        <Toaster />
      </StreamProvider>
    </AuthProvider>
  )
}
