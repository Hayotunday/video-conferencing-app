"use client"

declare global {
  interface Window {
    webkitSpeechRecognition: any
    SpeechRecognition: any
  }
}

export class MeetingSpeechRecognition {
  private recognition: SpeechRecognition | null = null
  private isRecording = false
  private onTranscriptCallback?: (transcript: string, isFinal: boolean) => void
  private onErrorCallback?: (error: string) => void
  private onStatusCallback?: (status: string) => void
  private restartTimeout?: NodeJS.Timeout
  private silenceTimeout?: NodeJS.Timeout
  private hasReceivedSpeech = false
  private consecutiveNoSpeechErrors = 0
  private maxNoSpeechErrors = 3
  private isRestarting = false

  constructor() {
    if (typeof window !== "undefined") {
      try {
        // Try webkitSpeechRecognition first (Chrome/Edge)
        if ("webkitSpeechRecognition" in window) {
          this.recognition = new (window as any).webkitSpeechRecognition()
        } else if ("SpeechRecognition" in window) {
          this.recognition = new window.SpeechRecognition()
        }

        if (this.recognition) {
          this.setupRecognition()
        }
      } catch (error) {
        console.error("Failed to initialize speech recognition:", error)
        this.recognition = null
      }
    }
  }

  private setupRecognition() {
    if (!this.recognition) return

    // Configure recognition settings
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = "en-US"
    this.recognition.maxAlternatives = 1

    // Remove the problematic grammars configuration entirely
    // Don't try to set grammars as it causes errors in some browsers

    this.recognition.onstart = () => {
      console.log("Speech recognition started")
      this.hasReceivedSpeech = false
      this.isRestarting = false
      this.onStatusCallback?.("listening")

      // Extended timeout for no-speech detection (30 seconds)
      this.silenceTimeout = setTimeout(() => {
        if (!this.hasReceivedSpeech && this.isRecording && !this.isRestarting) {
          console.log("Extended silence detected, checking microphone...")
          this.onStatusCallback?.("silence-detected")

          // Don't restart immediately, just notify user
          this.onErrorCallback?.("No speech detected for 30 seconds. Please check your microphone and speak clearly.")
        }
      }, 30000)
    }

    this.recognition.onresult = (event) => {
      this.hasReceivedSpeech = true
      this.consecutiveNoSpeechErrors = 0 // Reset error counter on successful speech

      // Clear silence timeout since we received speech
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout)
        this.silenceTimeout = undefined
      }

      this.onStatusCallback?.("processing")

      let interimTranscript = ""
      let finalTranscript = ""

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence

        if (event.results[i].isFinal) {
          // Only accept final results with reasonable confidence or any result if confidence is undefined
          if (confidence === undefined || confidence > 0.3) {
            finalTranscript += transcript
          }
        } else {
          interimTranscript += transcript
        }
      }

      if (finalTranscript.trim() && this.onTranscriptCallback) {
        this.onTranscriptCallback(finalTranscript.trim(), true)
        this.onStatusCallback?.("transcribed")
      } else if (interimTranscript.trim() && this.onTranscriptCallback) {
        this.onTranscriptCallback(interimTranscript.trim(), false)
        this.onStatusCallback?.("interim")
      }
    }

    this.recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error)

      // Clear timeouts
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout)
        this.silenceTimeout = undefined
      }

      let errorMessage = "Speech recognition error"
      let shouldRestart = false
      let shouldIncrementNoSpeechCounter = false

      switch (event.error) {
        case "no-speech":
          shouldIncrementNoSpeechCounter = true
          this.consecutiveNoSpeechErrors++

          if (this.consecutiveNoSpeechErrors <= this.maxNoSpeechErrors) {
            errorMessage = `No speech detected (${this.consecutiveNoSpeechErrors}/${this.maxNoSpeechErrors}). Trying again...`
            shouldRestart = true
          } else {
            errorMessage =
              "No speech detected multiple times. Please check your microphone, ensure it's unmuted, and try speaking louder."
            shouldRestart = false
            this.consecutiveNoSpeechErrors = 0 // Reset for next attempt
          }
          break

        case "audio-capture":
          errorMessage = "Microphone not accessible. Please check your microphone connection and permissions."
          break

        case "not-allowed":
          errorMessage = "Microphone permission denied. Please allow microphone access in your browser settings."
          break

        case "network":
          errorMessage = "Network error occurred. Check your internet connection."
          shouldRestart = true
          break

        case "aborted":
          errorMessage = "Speech recognition was stopped."
          break

        case "bad-grammar":
          errorMessage = "Speech recognition grammar error. Restarting..."
          shouldRestart = true
          break

        case "language-not-supported":
          errorMessage = "Language not supported for speech recognition."
          break

        default:
          errorMessage = `Speech recognition error: ${event.error}`
          shouldRestart = true
          break
      }

      this.onStatusCallback?.("error")

      if (this.onErrorCallback) {
        this.onErrorCallback(errorMessage)
      }

      // Auto-restart for certain errors if still recording
      if (shouldRestart && this.isRecording && !this.isRestarting) {
        this.scheduleRestart(shouldIncrementNoSpeechCounter ? 2000 : 1000)
      }
    }

    this.recognition.onend = () => {
      console.log("Speech recognition ended")
      this.onStatusCallback?.("stopped")

      // Clear timeouts
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout)
        this.silenceTimeout = undefined
      }

      if (this.isRecording && !this.isRestarting) {
        // Restart recognition if it stops unexpectedly
        this.scheduleRestart(500)
      }
    }
  }

  private scheduleRestart(delay = 1000) {
    if (this.restartTimeout) {
      clearTimeout(this.restartTimeout)
    }

    this.isRestarting = true
    this.onStatusCallback?.("restarting")

    // Wait before restarting to avoid rapid restarts
    this.restartTimeout = setTimeout(() => {
      if (this.isRecording) {
        this.restartRecognition()
      }
    }, delay)
  }

  private restartRecognition() {
    if (!this.recognition || !this.isRecording) {
      this.isRestarting = false
      return
    }

    try {
      console.log("Restarting speech recognition...")
      this.recognition.start()
    } catch (error) {
      console.error("Failed to restart recognition:", error)
      this.isRestarting = false

      // If restart fails, try again after a longer delay
      if (this.isRecording) {
        this.scheduleRestart(3000)
      }
    }
  }

  startRecording(
    onTranscript: (transcript: string, isFinal: boolean) => void,
    onError?: (error: string) => void,
    onStatus?: (status: string) => void,
  ) {
    if (!this.recognition) {
      throw new Error("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.")
    }

    if (this.isRecording) {
      console.log("Already recording, stopping first...")
      this.stopRecording()
      // Wait a bit before starting again
      setTimeout(() => this.startRecording(onTranscript, onError, onStatus), 500)
      return
    }

    this.onTranscriptCallback = onTranscript
    this.onErrorCallback = onError
    this.onStatusCallback = onStatus
    this.isRecording = true
    this.consecutiveNoSpeechErrors = 0
    this.isRestarting = false

    try {
      this.onStatusCallback?.("starting")
      this.recognition.start()
    } catch (error) {
      console.error("Failed to start recognition:", error)
      this.isRecording = false
      this.isRestarting = false

      if (onError) {
        onError("Failed to start speech recognition. Please check your microphone permissions and try again.")
      }
    }
  }

  stopRecording() {
    if (this.recognition && this.isRecording) {
      this.isRecording = false
      this.isRestarting = false

      // Clear all timeouts
      if (this.restartTimeout) {
        clearTimeout(this.restartTimeout)
        this.restartTimeout = undefined
      }

      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout)
        this.silenceTimeout = undefined
      }

      try {
        this.recognition.stop()
        this.onStatusCallback?.("stopped")
      } catch (error) {
        console.error("Error stopping recognition:", error)
      }
    }
  }

  isSupported(): boolean {
    return this.recognition !== null
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording && !this.isRestarting
  }

  resetErrorCount() {
    this.consecutiveNoSpeechErrors = 0
  }
}
