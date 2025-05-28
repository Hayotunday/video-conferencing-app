"use client";

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ChevronDown, ChevronUp, Loader2, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { MeetingThumbnail } from "./meeting-thumbnail";
import { Button } from "./ui/button";

interface CreateMeetingCardProps {
  newMeetingTitle: string;
  setNewMeetingTitle: (e: React.ChangeEvent<HTMLInputElement>) => void;
  meetingThumbnail: string;
  handleThumbnailChange: (thumbnail: string) => void;
  createMeeting: () => void;
  loading: boolean;
}

const CreateMeetingcard = ({
  newMeetingTitle,
  setNewMeetingTitle,
  meetingThumbnail,
  handleThumbnailChange,
  createMeeting,
  loading,
}: CreateMeetingCardProps) => {
  const [isOpened, setIsOpened] = useState(false);

  const toggleOpen = () => {
    setIsOpened(!isOpened);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Meeting
          </div>
          <div className="" onClick={toggleOpen}>
            {isOpened ? (
              <ChevronUp className="size-5" />
            ) : (
              <ChevronDown className="size-5" />
            )}
          </div>
        </CardTitle>
        <CardDescription>Start a new video conference</CardDescription>
      </CardHeader>
      {isOpened && (
        <CardContent className="space-y-4">
          <Input
            placeholder="Meeting title"
            value={newMeetingTitle}
            onChange={setNewMeetingTitle}
          />
          <MeetingThumbnail
            currentThumbnail={meetingThumbnail}
            onThumbnailChange={handleThumbnailChange}
          />
          <Button
            onClick={createMeeting}
            className="w-full"
            disabled={loading || !newMeetingTitle.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>Create Meeting</>
            )}
          </Button>
        </CardContent>
      )}
    </Card>
  );
};

export default CreateMeetingcard;
