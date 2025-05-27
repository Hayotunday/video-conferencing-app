"use client"

import { Button } from "@/components/ui/button"
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff } from "lucide-react"

interface CallControlsProps {
  isAudioEnabled: boolean
  isVideoEnabled: boolean
  isScreenSharing: boolean
  isTogglingAudio: boolean
  isTogglingVideo: boolean
  isTogglingScreen: boolean
  onToggleAudio: () => void
  onToggleVideo: () => void
  onToggleScreenShare: () => void
  onLeaveCall: () => void
}

export function CallControls({
  isAudioEnabled,
  isVideoEnabled,
  isScreenSharing,
  isTogglingAudio,
  isTogglingVideo,
  isTogglingScreen,
  onToggleAudio,
  onToggleVideo,
  onToggleScreenShare,
  onLeaveCall,
}: CallControlsProps) {
  return (
    <div className="p-6 bg-gray-800 border-t border-gray-700">
      <div className="flex items-center justify-center gap-4">
        {/* Audio Toggle */}
        <Button
          onClick={onToggleAudio}
          disabled={isTogglingAudio}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isAudioEnabled ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"
          }`}
          title={isAudioEnabled ? "Mute microphone" : "Unmute microphone"}
        >
          {isTogglingAudio ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isAudioEnabled ? (
            <Mic className="h-5 w-5" />
          ) : (
            <MicOff className="h-5 w-5" />
          )}
        </Button>

        {/* Video Toggle */}
        <Button
          onClick={onToggleVideo}
          disabled={isTogglingVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isVideoEnabled ? "bg-gray-600 hover:bg-gray-500 text-white" : "bg-red-600 hover:bg-red-500 text-white"
          }`}
          title={isVideoEnabled ? "Turn off camera" : "Turn on camera"}
        >
          {isTogglingVideo ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isVideoEnabled ? (
            <Video className="h-5 w-5" />
          ) : (
            <VideoOff className="h-5 w-5" />
          )}
        </Button>

        {/* Screen Share Toggle */}
        <Button
          onClick={onToggleScreenShare}
          disabled={isTogglingScreen}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
            isScreenSharing ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-gray-600 hover:bg-gray-500 text-white"
          }`}
          title={isScreenSharing ? "Stop screen sharing" : "Share screen"}
        >
          {isTogglingScreen ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isScreenSharing ? (
            <MonitorOff className="h-5 w-5" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
        </Button>

        {/* Leave Call */}
        <Button
          onClick={onLeaveCall}
          className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all"
          title="Leave call"
        >
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>

      {/* Control Labels */}
      <div className="flex items-center justify-center gap-4 mt-3">
        <span className="text-xs text-gray-400 w-12 text-center">{isAudioEnabled ? "Mic" : "Muted"}</span>
        <span className="text-xs text-gray-400 w-12 text-center">{isVideoEnabled ? "Video" : "Off"}</span>
        <span className="text-xs text-gray-400 w-12 text-center">{isScreenSharing ? "Sharing" : "Share"}</span>
        <span className="text-xs text-gray-400 w-12 text-center">Leave</span>
      </div>
    </div>
  )
}
