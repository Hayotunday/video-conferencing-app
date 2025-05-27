"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react"
import { checkBrowserCapabilities } from "@/lib/browser-utils"

export function BrowserCompatibility() {
  const [capabilities, setCapabilities] = useState<ReturnType<typeof checkBrowserCapabilities> | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    setCapabilities(checkBrowserCapabilities())
  }, [])

  if (!capabilities) return null

  const hasIssues = !capabilities.supportsScreenShare || !capabilities.hasGetUserMedia || !capabilities.supportsWebRTC

  if (!hasIssues) return null

  return (
    <Card className="mb-4 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <AlertTriangle className="h-5 w-5" />
          Browser Compatibility Notice
        </CardTitle>
        <CardDescription className="text-yellow-700">
          Some features may be limited due to browser or connection settings.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {capabilities.supportsWebRTC ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">WebRTC Support</span>
          </div>

          <div className="flex items-center gap-2">
            {capabilities.hasGetUserMedia ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">Camera/Microphone Access</span>
          </div>

          <div className="flex items-center gap-2">
            {capabilities.supportsScreenShare ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm">Screen Sharing</span>
            {!capabilities.supportsScreenShare && <span className="text-xs text-gray-600">(Requires HTTPS)</span>}
          </div>
        </div>

        {!capabilities.isSecureContext && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">HTTPS Required</p>
                <p>For full functionality including screen sharing, please access this app via HTTPS or localhost.</p>
              </div>
            </div>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-yellow-800 border-yellow-300"
        >
          {showDetails ? "Hide" : "Show"} Details
        </Button>

        {showDetails && (
          <div className="text-xs text-gray-600 space-y-1 pt-2 border-t border-yellow-200">
            <p>• Secure Context: {capabilities.isSecureContext ? "Yes" : "No"}</p>
            <p>• Protocol: {typeof window !== "undefined" ? window.location.protocol : "Unknown"}</p>
            <p>• Hostname: {typeof window !== "undefined" ? window.location.hostname : "Unknown"}</p>
            <p>• getDisplayMedia: {capabilities.hasGetDisplayMedia ? "Available" : "Not Available"}</p>
            <p>• getUserMedia: {capabilities.hasGetUserMedia ? "Available" : "Not Available"}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
