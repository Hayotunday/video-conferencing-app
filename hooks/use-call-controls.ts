"use client"

import { useCallback } from "react"
import { useCallStateHooks } from "@stream-io/video-react-sdk"

export function useCallControls() {
  const { useMicrophoneState, useCameraState, useScreenShareState } = useCallStateHooks()

  const { microphone, isMute: isAudioMuted } = useMicrophoneState()
  const { camera, isMute: isVideoMuted } = useCameraState()
  const { screenShare, hasScreenShare } = useScreenShareState()

  const toggleAudio = useCallback(async () => {
    try {
      console.log("Toggling audio, current mute state:", isAudioMuted)
      if (isAudioMuted) {
        await microphone.enable()
        console.log("Audio enabled")
      } else {
        await microphone.disable()
        console.log("Audio disabled")
      }
    } catch (error) {
      console.error("Error toggling audio:", error)
    }
  }, [microphone, isAudioMuted])

  const toggleVideo = useCallback(async () => {
    try {
      console.log("Toggling video, current mute state:", isVideoMuted)
      if (isVideoMuted) {
        await camera.enable()
        console.log("Video enabled")
      } else {
        await camera.disable()
        console.log("Video disabled")
      }
    } catch (error) {
      console.error("Error toggling video:", error)
    }
  }, [camera, isVideoMuted])

  const toggleScreenShare = useCallback(async () => {
    try {
      console.log("Toggling screen share, current state:", hasScreenShare)
      if (hasScreenShare) {
        await screenShare.disable()
        console.log("Screen sharing disabled")
      } else {
        await screenShare.enable()
        console.log("Screen sharing enabled")
      }
    } catch (error) {
      console.error("Error toggling screen share:", error)
    }
  }, [screenShare, hasScreenShare])

  return {
    // States
    isAudioMuted,
    isVideoMuted,
    hasScreenShare,

    // Controls
    toggleAudio,
    toggleVideo,
    toggleScreenShare,

    // Direct access to Stream objects
    microphone,
    camera,
    screenShare,
  }
}
