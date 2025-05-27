"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Mic, MicOff, FileText, Download, AlertCircle, X, RefreshCw, Volume2, VolumeX } from "lucide-react"
import type { MeetingTranscript } from "@/types/meeting-summary"

interface MeetingTranscriptProps {
  transcript: MeetingTranscript[]
  currentInterim: string
  isRecording: boolean
  onToggleRecording: () => void
  isSupported: boolean
  error?: string | null
  status?: string
  isInitializing?: boolean
  onClearError?: () => void
  onRetry?: () => void
}

export function MeetingTranscriptComponent({
  transcript,
  currentInterim,
  isRecording,
  onToggleRecording,
  isSupported,
  error,
  status = "stopped",
  isInitializing,
  onClearError,
  onRetry,
}: MeetingTranscriptProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const exportTranscript = () => {
    const transcriptText = transcript
      .map((t) => `[${t.timestamp.toLocaleTimeString()}] ${t.participantName}: ${t.text}`)
      .join("\n")

    const blob = new Blob([transcriptText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meeting-transcript-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const getStatusInfo = () => {
    switch (status) {
      case "starting":
        return { text: "Starting...", color: "bg-yellow-600", icon: RefreshCw, animate: true }
      case "listening":
        return { text: "Listening", color: "bg-green-600", icon: Volume2, animate: false }
      case "processing":
        return { text: "Processing", color: "bg-blue-600", icon: Volume2, animate: true }
      case "transcribed":
        return { text: "Transcribed", color: "bg-green-600", icon: Volume2, animate: false }
      case "interim":
        return { text: "Speaking", color: "bg-blue-600", icon: Volume2, animate: true }
      case "silence-detected":
        return { text: "Silence", color: "bg-yellow-600", icon: VolumeX, animate: false }
      case "restarting":
        return { text: "Restarting", color: "bg-yellow-600", icon: RefreshCw, animate: true }
      case "error":
        return { text: "Error", color: "bg-red-600", icon: AlertCircle, animate: false }
      case "stopped":
      default:
        return { text: "Stopped", color: "bg-gray-600", icon: MicOff, animate: false }
    }
  }

  if (!isSupported) {
    return (
      <Card className="w-80 border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-800">
            <MicOff className="h-4 w-4" />
            <div>
              <p className="text-sm font-medium">Speech recognition not supported</p>
              <p className="text-xs text-yellow-700 mt-1">Please use Chrome, Edge, or Safari for speech recognition</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  return (
    <Card className="w-80 bg-gray-800 text-white border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4" />
            Transcript
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs text-white ${statusInfo.color}`}>
              <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.animate ? "animate-spin" : ""}`} />
              {statusInfo.text}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleRecording}
              className="text-white hover:bg-gray-700"
              disabled={isInitializing}
            >
              {isInitializing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <CardDescription className="text-gray-300">
          {transcript.length} messages • {isRecording ? "Live transcription" : "Transcription paused"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-600 bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300 text-sm pr-6">
              {error}
              <div className="flex gap-2 mt-2">
                {onRetry && (
                  <Button variant="outline" size="sm" onClick={onRetry} className="h-6 text-xs">
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                )}
                {onClearError && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearError}
                    className="h-6 text-xs text-red-400 hover:text-red-300"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Microphone Tips */}
        {isRecording && transcript.length === 0 && !currentInterim && !error && status === "listening" && (
          <Alert className="border-blue-600 bg-blue-900/20">
            <Mic className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300 text-sm">
              <div className="space-y-1">
                <p className="font-medium">Ready to transcribe!</p>
                <p>Speak clearly and at normal volume. The system is listening for your voice.</p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-64 w-full">
          <div className="space-y-2 pr-4">
            {transcript.map((t) => (
              <div key={t.id} className="text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-blue-300">{t.participantName}</span>
                  <span className="text-xs text-gray-400">{t.timestamp.toLocaleTimeString()}</span>
                </div>
                <p className="text-gray-100 leading-relaxed">{t.text}</p>
              </div>
            ))}
            {currentInterim && (
              <div className="text-sm opacity-70">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-blue-300">You</span>
                  <span className="text-xs text-gray-400">Speaking...</span>
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                </div>
                <p className="text-gray-300 italic">{currentInterim}</p>
              </div>
            )}
            {transcript.length === 0 && !currentInterim && !error && !isInitializing && status === "stopped" && (
              <div className="text-center py-8 text-gray-400">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No speech detected yet</p>
                <p className="text-xs mt-1">Click the microphone to start transcription</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 text-white border-gray-600 hover:bg-gray-700"
          >
            {isExpanded ? "Collapse" : "Expand"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportTranscript}
            disabled={transcript.length === 0}
            className="text-white border-gray-600 hover:bg-gray-700"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

        {/* Enhanced Tips */}
        <div className="text-xs text-gray-400 space-y-1">
          <p>💡 For best results:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Speak clearly at normal volume</li>
            <li>Allow microphone access when prompted</li>
            <li>Use Chrome or Edge browser</li>
            <li>Minimize background noise</li>
            <li>Ensure microphone is not muted</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
