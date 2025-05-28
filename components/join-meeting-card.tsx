"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LogIn,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface JoinMeetingCardProps {
  onJoinMeeting: (roomId: string) => void;
}

export function JoinMeetingCard({ onJoinMeeting }: JoinMeetingCardProps) {
  const [isOpened, setIsOpened] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const toggleOpen = () => {
    setIsOpened(!isOpened);
  };

  // Function to validate the room ID format
  const validateRoomId = (id: string): boolean => {
    // Basic validation for room ID format
    if (!id.trim()) return false;

    // Check if it's a valid room ID format (alphanumeric, underscores, hyphens)
    const roomIdPattern = /^[a-zA-Z0-9_-]+$/;
    return roomIdPattern.test(id.trim()) && id.trim().length >= 3;
  };

  const handleJoinMeeting = async () => {
    const trimmedRoomId = roomId.trim();

    if (!trimmedRoomId) {
      setError("Please enter a meeting room ID");
      return;
    }

    if (!validateRoomId(trimmedRoomId)) {
      setError(
        "Invalid room ID format. Use only letters, numbers, underscores, and hyphens."
      );
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      // Simulate a brief validation delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast({
        title: "Joining Meeting",
        description: `Connecting to room: ${trimmedRoomId}`,
      });

      onJoinMeeting(trimmedRoomId);
    } catch (error) {
      console.error("Error joining meeting:", error);
      setError("Failed to join meeting. Please try again.");
    } finally {
      setIsJoining(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isJoining) {
      handleJoinMeeting();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRoomId(value);

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  return (
    <Card className="">
      <CardHeader className="">
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LogIn className="h-5 w-5" />
            Join Meeting
          </div>
          <div className="" onClick={toggleOpen}>
            {isOpened ? (
              <ChevronUp className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </div>
        </CardTitle>
        <CardDescription className="">
          Enter a meeting room ID to join an existing meeting
        </CardDescription>
      </CardHeader>
      {isOpened && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomId" className="text-xs">
              Meeting Room ID
            </Label>
            <Input
              id="roomId"
              placeholder="Enter room ID"
              value={roomId}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              disabled={isJoining}
              className={`text-sm ${
                error ? "border-red-500 focus:border-red-500" : ""
              }`}
            />
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-3 w-3" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <Button
            onClick={handleJoinMeeting}
            className="w-full"
            size="sm"
            disabled={isJoining || !roomId.trim()}
          >
            {isJoining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>Join Meeting</>
            )}
          </Button>

          {/* Compact help text */}
          <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
            <p className="font-medium mb-1">Examples:</p>
            <p>room_123456meeting_abc</p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
