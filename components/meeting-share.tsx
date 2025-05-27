"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { generateMeetingLink, copyToClipboard, shareMeetingLink } from "@/lib/meeting-utils"
import { Share2, Copy, Link, Mail, MessageCircle, Check } from "lucide-react"

interface MeetingShareProps {
  roomId: string
  title: string
  children?: React.ReactNode
}

export function MeetingShare({ roomId, title, children }: MeetingShareProps) {
  const { toast } = useToast()
  const [copied, setCopied] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const meetingLink = generateMeetingLink(roomId)

  const handleCopyLink = async () => {
    const success = await copyToClipboard(meetingLink)

    if (success) {
      setCopied(true)
      toast({
        title: "Link copied!",
        description: "Meeting link has been copied to clipboard",
      })

      setTimeout(() => setCopied(false), 2000)
    } else {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please copy manually.",
        variant: "destructive",
      })
    }
  }

  const handleNativeShare = () => {
    shareMeetingLink(roomId, title)

    if (!navigator.share) {
      toast({
        title: "Link copied!",
        description: "Meeting link has been copied to clipboard",
      })
    }
  }

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Join ${title} - Video Conference`)
    const body = encodeURIComponent(
      `You're invited to join "${title}" video conference.\n\nJoin here: ${meetingLink}\n\nMeeting ID: ${roomId}`,
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`You're invited to join "${title}" video conference.\n\nJoin here: ${meetingLink}`)
    window.open(`https://wa.me/?text=${text}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Meeting
          </DialogTitle>
          <DialogDescription>Share this meeting link with participants</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Meeting Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{title}</CardTitle>
              <CardDescription className="text-xs">Meeting ID: {roomId}</CardDescription>
            </CardHeader>
          </Card>

          {/* Copy Link Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Link</label>
            <div className="flex gap-2">
              <Input value={meetingLink} readOnly className="flex-1 text-sm" />
              <Button onClick={handleCopyLink} variant="outline" size="sm" className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Quick Share Buttons */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Quick Share</label>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleNativeShare} variant="outline" className="flex items-center gap-2">
                <Share2 className="h-4 w-4" />
                Share
              </Button>

              <Button onClick={handleCopyLink} variant="outline" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Copy Link
              </Button>

              <Button onClick={handleEmailShare} variant="outline" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Button>

              <Button onClick={handleWhatsAppShare} variant="outline" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>How to join:</strong> Participants can click the link or go to the meeting page and enter the
              Meeting ID: <code className="bg-blue-100 px-1 rounded">{roomId}</code>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
