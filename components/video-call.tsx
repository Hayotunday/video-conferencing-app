"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  type Call,
  StreamCall,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from "@stream-io/video-react-sdk";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  Users,
  Wifi,
  WifiOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Share2,
  MoreHorizontal,
  FileText,
} from "lucide-react";
import { MeetingShare } from "@/components/meeting-share";
import { MeetingTranscriptComponent } from "@/components/meeting-transcript";
import { MeetingSummaryModal } from "@/components/meeting-summary-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMeetingTranscript } from "@/hooks/use-meeting-transcript";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";

interface VideoCallProps {
  call: Call;
  onLeave?: () => void;
}

// Define interfaces for your expected custom data structures
interface AppCallCustomData {
  title?: string;
  created_by_id?: string; // As set in MeetingWrapper
  // Add any other custom properties you expect on a call object
}

interface AppParticipantCustomData {
  email?: string;
  // Add any other custom properties you expect on a participant object
}
// Inner component that uses call state hooks
function VideoCallContent({ onLeave }: { onLeave?: () => void }) {
  const router = useRouter();
  const call = useCall();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showParticipants, setShowParticipants] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connected");
  const [isTranscriptRecording, setIsTranscriptRecording] = useState(true);
  const [meetingStartTime] = useState(Date.now());
  const mountedRef = useRef(true);
  const hasLeftRef = useRef(false);

  const {
    useParticipantCount,
    useCallCallingState,
    useParticipants,
    useLocalParticipant,
    useMicrophoneState,
    useCameraState,
  } = useCallStateHooks();

  const participantCount = useParticipantCount() || 0;
  const callingState = useCallCallingState() || "unknown";
  const participants = useParticipants();
  const localParticipant = useLocalParticipant();

  // Use Stream's built-in state hooks for media controls
  const { microphone, isMute: isAudioMuted } = useMicrophoneState();
  const { camera, isMute: isVideoMuted } = useCameraState();

  // Get meeting info from call
  const roomId = call?.id || "";
  const meetingTitle =
    (call?.state?.custom as AppCallCustomData)?.title || `Meeting Room`;

  // Meeting transcript hook
  const {
    transcript,
    currentInterim,
    isSupported: isTranscriptSupported,
    error: transcriptError,
    status: transcriptStatus,
    isInitializing: isTranscriptInitializing,
    clearTranscript,
    clearError: clearTranscriptError,
    retryRecording,
  } = useMeetingTranscript({
    meetingId: roomId,
    participantId: user?.uid || "",
    participantName: user?.displayName || user?.email || "Unknown",
    isRecording: isTranscriptRecording,
  });

  useEffect(() => {
    mountedRef.current = true;
    setConnectionStatus("connected");

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const toggleAudio = useCallback(async () => {
    try {
      console.log("Toggling audio, current mute state:", isAudioMuted);
      if (isAudioMuted) {
        await microphone.enable();
        console.log("Audio enabled");
      } else {
        await microphone.disable();
        console.log("Audio disabled");
      }
    } catch (error) {
      console.error("Error toggling audio:", error);
      toast({
        title: "Audio Error",
        description:
          "Failed to toggle microphone. Please check your permissions.",
        variant: "destructive",
      });
    }
  }, [microphone, isAudioMuted, toast]);

  const toggleVideo = useCallback(async () => {
    try {
      console.log("Toggling video, current mute state:", isVideoMuted);
      if (isVideoMuted) {
        await camera.enable();
        console.log("Video enabled");
      } else {
        await camera.disable();
        console.log("Video disabled");
      }
    } catch (error) {
      console.error("Error toggling video:", error);
      toast({
        title: "Video Error",
        description: "Failed to toggle camera. Please check your permissions.",
        variant: "destructive",
      });
    }
  }, [camera, isVideoMuted, toast]);

  const performLeaveActions = useCallback(async () => {
    try {
      // First, leave the Stream call
      if (call) {
        await call.leave();
        console.log("Successfully left Stream call");
      }

      // Then call the onLeave callback or navigate
      if (onLeave) {
        onLeave();
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error during actual leave call operation:", error);
      // Still navigate even if there's an error leaving the call
      if (onLeave) {
        onLeave();
      } else {
        router.push("/dashboard");
      }
    }
  }, [call, onLeave, router]);

  const handleLeaveCall = useCallback(async () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    try {
      console.log("Initiating leave call sequence...");

      // Show summary modal if there's transcript data
      if (transcript.length > 0) {
        setShowSummaryModal(true);
        return; // Don't leave immediately, let user see summary first
      }

      await performLeaveActions();
    } catch (error) {
      console.error("Error during leave call:", error);
      // Still navigate even if there's an error leaving the call
      // If showing summary modal failed or other pre-leave error, ensure cleanup
      await performLeaveActions(); // Attempt to leave anyway
    }
  }, [transcript, performLeaveActions]);

  const handleSummaryModalClose = useCallback(async () => {
    setShowSummaryModal(false);
    console.log("Summary modal closed, proceeding to leave call.");

    // Now actually leave the call
    await performLeaveActions();
  }, [performLeaveActions]);

  const toggleParticipants = useCallback(() => {
    setShowParticipants((prev) => !prev);
  }, []);

  const toggleTranscript = useCallback(() => {
    setShowTranscript((prev) => !prev);
  }, []);

  const toggleTranscriptRecording = useCallback(() => {
    setIsTranscriptRecording((prev) => !prev);
  }, []);

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-4 w-4 text-green-400" />;
      case "connecting":
        return <Wifi className="h-4 w-4 text-yellow-400" />;
      case "disconnected":
        return <WifiOff className="h-4 w-4 text-red-400" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get participant emails for summary
  const participantEmails = participants
    .map((p) => (p.custom as AppParticipantCustomData)?.email || "")
    .filter(Boolean);

  const participantNames = participants
    .map((p) => p.name || p.userId)
    .filter(Boolean);

  const meetingDuration = Math.floor((Date.now() - meetingStartTime) / 1000);

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-gray-800 text-white border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">{meetingTitle}</h1>
          <span className="text-sm text-gray-300">{roomId}</span>
        </div>

        <div className="flex items-center gap-4 text-white">
          <div className="flex items-center gap-2">
            {getConnectionIcon()}
            <span className="text-xs text-gray-300 capitalize">
              {connectionStatus}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-sm text-white">
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="text-xs text-gray-300 capitalize">
            {callingState}
          </span>

          {/* More Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-gray-700 hover:text-white"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <MeetingShare roomId={roomId} title={meetingTitle}>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Meeting Link
                </DropdownMenuItem>
              </MeetingShare>
              <DropdownMenuItem onClick={toggleParticipants}>
                <Users className="h-4 w-4 mr-2" />
                {showParticipants ? "Hide" : "Show"} Participants
              </DropdownMenuItem>
              {isTranscriptSupported && (
                <DropdownMenuItem onClick={toggleTranscript}>
                  <FileText className="h-4 w-4 mr-2" />
                  {showTranscript ? "Hide" : "Show"} Transcript
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex-1 flex bg-gray-900">
        <div className="flex-1 relative">
          {/* Video layout */}
          <div className="h-full w-full video-call-container">
            <SpeakerLayout />
          </div>
        </div>

        {/* Participants Panel */}
        {showParticipants && (
          <div className="w-80 bg-gray-800 text-white p-4 border-l border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">
                Participants ({participantCount})
              </h3>
              <MeetingShare roomId={roomId} title={meetingTitle}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-gray-700"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </MeetingShare>
            </div>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div
                  key={participant.sessionId}
                  className="flex items-center gap-3 p-2 rounded-lg bg-gray-700"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                    {participant.name?.charAt(0).toUpperCase() ||
                      participant.userId.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">
                      {participant.name || participant.userId}
                      {participant.isLocalParticipant && " (You)"}
                    </p>
                    <p className="text-xs text-gray-300">
                      {participant.audioStream?.active ? "🎤" : "🔇"}{" "}
                      {participant.videoStream?.active ? "📹" : "📷"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript Panel */}
        {showTranscript && isTranscriptSupported && (
          <MeetingTranscriptComponent
            transcript={transcript}
            currentInterim={currentInterim}
            isRecording={isTranscriptRecording}
            onToggleRecording={toggleTranscriptRecording}
            isSupported={isTranscriptSupported}
            error={transcriptError}
            status={transcriptStatus}
            isInitializing={isTranscriptInitializing}
            onClearError={clearTranscriptError}
            onRetry={retryRecording}
          />
        )}
      </div>

      {/* Custom Call Controls */}
      <div className="p-3 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-center gap-4">
          {/* Audio Toggle */}
          <div className="flex flex-col items-center justify-center gap-2 text-white">
            <Button
              onClick={toggleAudio}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                !isAudioMuted
                  ? "bg-gray-600 hover:bg-gray-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
              title={!isAudioMuted ? "Mute microphone" : "Unmute microphone"}
            >
              {!isAudioMuted ? (
                <Mic className="h-5 w-5" />
              ) : (
                <MicOff className="h-5 w-5" />
              )}
            </Button>
            {!isAudioMuted ? "Mic" : "Muted"}
          </div>

          {/* Video Toggle */}
          <div className="flex flex-col items-center justify-center gap-2 text-white">
            <Button
              onClick={toggleVideo}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                !isVideoMuted
                  ? "bg-gray-600 hover:bg-gray-500 text-white"
                  : "bg-red-600 hover:bg-red-500 text-white"
              }`}
              title={!isVideoMuted ? "Turn off camera" : "Turn on camera"}
            >
              {!isVideoMuted ? (
                <Video className="h-5 w-5" />
              ) : (
                <VideoOff className="h-5 w-5" />
              )}
            </Button>
            {!isVideoMuted ? "Video" : "Off"}
          </div>

          {/* Share Meeting */}
          <div className="flex flex-col items-center justify-center gap-2 text-white">
            <MeetingShare roomId={roomId} title={meetingTitle}>
              <Button
                className="w-12 h-12 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center transition-all"
                title="Share meeting link"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </MeetingShare>
            Invite
          </div>

          {/* Leave Call */}
          <div className="flex flex-col items-center justify-center gap-2 text-white">
            <Button
              onClick={handleLeaveCall}
              className="w-12 h-12 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center transition-all"
              title="Leave call"
            >
              <PhoneOff className="h-5 w-5" />
            </Button>
            Leave
          </div>
        </div>

        {/* Control Labels */}
        {/* <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-xs text-gray-400 w-12 text-center">{!isAudioMuted ? "Mic" : "Muted"}</span>
          <span className="text-xs text-gray-400 w-12 text-center">{!isVideoMuted ? "Video" : "Off"}</span>
          <span className="text-xs text-gray-400 w-12 text-center">Invite</span>
          <span className="text-xs text-gray-400 w-12 text-center">Leave</span>
        </div> */}
      </div>

      {/* Meeting Summary Modal */}
      <MeetingSummaryModal
        isOpen={showSummaryModal}
        onClose={handleSummaryModalClose}
        meetingId={roomId}
        meetingTitle={meetingTitle}
        participants={participantNames}
        transcript={transcript}
        duration={meetingDuration}
        participantEmails={participantEmails}
      />

      {/* Additional CSS for this component */}
      <style jsx>{`
        .video-call-container :global(.str-video__participant-view) {
          border-radius: 8px;
          overflow: hidden;
        }

        .video-call-container :global(.str-video__participant-details) {
          color: white !important;
        }

        .video-call-container :global(.str-video__participant-name) {
          background: rgba(0, 0, 0, 0.7) !important;
          color: white !important;
          padding: 4px 8px !important;
          border-radius: 4px !important;
          font-weight: 500 !important;
        }

        /* Hide default call controls */
        .video-call-container :global(.str-video__call-controls) {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

// Main component that wraps with StreamCall
export function VideoCall({ call, onLeave }: VideoCallProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading call interface...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamCall call={call}>
      <VideoCallContent onLeave={onLeave} />
    </StreamCall>
  );
}
