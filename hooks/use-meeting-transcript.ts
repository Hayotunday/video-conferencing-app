"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { MeetingSpeechRecognition } from "@/lib/speech-recognition"
import type { MeetingTranscript } from "@/types/meeting-summary"

interface UseMeetingTranscriptProps {
  meetingId: string
  participantId: string
  participantName: string
  isRecording: boolean
}

export function useMeetingTranscript({
  meetingId,
  participantId,
  participantName,
  isRecording,
}: UseMeetingTranscriptProps) {
  const [transcript, setTranscript] = useState<MeetingTranscript[]>([])
  const [isSupported, setIsSupported] = useState(false)
  const [currentInterim, setCurrentInterim] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>("stopped")
  const [isInitializing, setIsInitializing] = useState(false)
  const speechRecognition = useRef<MeetingSpeechRecognition | null>(null)

  useEffect(() => {
    speechRecognition.current = new MeetingSpeechRecognition()
    setIsSupported(speechRecognition.current.isSupported())

    return () => {
      if (speechRecognition.current) {
        speechRecognition.current.stopRecording()
      }
    }
  }, [])

  const handleTranscript = useCallback(
    (text: string, isFinal: boolean) => {
      if (!text.trim()) return

      if (isFinal) {
        const newTranscript: MeetingTranscript = {
          id: `${Date.now()}-${Math.random()}`,
          meetingId,
          participantId,
          participantName,
          timestamp: new Date(),
          text: text.trim(),
        }

        setTranscript((prev) => [...prev, newTranscript])
        setCurrentInterim("")
        setError(null) // Clear any previous errors on successful transcript
      } else {
        setCurrentInterim(text)
      }
    },
    [meetingId, participantId, participantName],
  )

  const handleError = useCallback((errorMessage: string) => {
    console.error("Speech recognition error:", errorMessage)
    setError(errorMessage)
    setCurrentInterim("")
  }, [])

  const handleStatus = useCallback((newStatus: string) => {
    setStatus(newStatus)

    // Clear initializing state when we start listening
    if (newStatus === "listening") {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    if (!speechRecognition.current || !isSupported) return

    if (isRecording) {
      setIsInitializing(true)
      setError(null)

      try {
        speechRecognition.current.startRecording(handleTranscript, handleError, handleStatus)
      } catch (error) {
        console.error("Failed to start speech recognition:", error)
        setError("Failed to start speech recognition. Please check your microphone permissions.")
        setIsInitializing(false)
        setStatus("error")
      }
    } else {
      speechRecognition.current.stopRecording()
      setCurrentInterim("")
      setIsInitializing(false)
      setStatus("stopped")
    }
  }, [isRecording, isSupported, handleTranscript, handleError, handleStatus])

  const clearTranscript = useCallback(() => {
    setTranscript([])
    setCurrentInterim("")
    setError(null)
    setStatus("stopped")
  }, [])

  const clearError = useCallback(() => {
    setError(null)
    // Reset error count in speech recognition
    if (speechRecognition.current) {
      speechRecognition.current.resetErrorCount()
    }
  }, [])

  const retryRecording = useCallback(() => {
    if (speechRecognition.current && isSupported) {
      setError(null)
      speechRecognition.current.resetErrorCount()

      // Stop and restart
      speechRecognition.current.stopRecording()
      setTimeout(() => {
        if (speechRecognition.current) {
          try {
            speechRecognition.current.startRecording(handleTranscript, handleError, handleStatus)
          } catch (error) {
            console.error("Failed to retry speech recognition:", error)
            setError("Failed to restart speech recognition. Please check your microphone.")
          }
        }
      }, 1000)
    }
  }, [isSupported, handleTranscript, handleError, handleStatus])

  return {
    transcript,
    currentInterim,
    isSupported,
    error,
    status,
    isInitializing,
    clearTranscript,
    clearError,
    retryRecording,
  }
}
