"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"
import { checkBrowserCapabilities } from "@/lib/browser-utils"

export function BrowserCompatibility() {
  const [capabilities, setCapabilities] = useState<ReturnType<typeof checkBrowserCapabilities> | null>(null)

  useEffect(() => {
    setCapabilities(checkBrowserCapabilities())
  }, [])

  if (!capabilities) return null

  const hasIssues = !capabilities.supportsScreenShare || !capabilities.hasGetUserMedia || !capabilities.supportsWebRTC

  if (!hasIssues) return null

  return (
    <div className="p-4 border-b border-gray-100">
      <Alert className="border-yellow-200 bg-yellow-50 py-2">
        <AlertTriangle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-xs text-yellow-800">
          <p className="font-medium">Browser Notice</p>
          <p>Some features may be limited. Use Chrome or Edge for best experience.</p>
        </AlertDescription>
      </Alert>
    </div>
  )
}
