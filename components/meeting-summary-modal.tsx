"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { generateMeetingSummary, sendSummaryEmail } from "@/app/actions/meeting-summary"
import type { MeetingSummary, MeetingTranscript } from "@/types/meeting-summary"
import { FileText, Clock, Users, CheckCircle, ArrowRight, Lightbulb, Mail, Download, Loader2 } from "lucide-react"

interface MeetingSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: string
  meetingTitle: string
  participants: string[]
  transcript: MeetingTranscript[]
  duration: number
  participantEmails: string[]
}

export function MeetingSummaryModal({
  isOpen,
  onClose,
  meetingId,
  meetingTitle,
  participants,
  transcript,
  duration,
  participantEmails,
}: MeetingSummaryModalProps) {
  const [summary, setSummary] = useState<MeetingSummary | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && transcript.length > 0) {
      generateSummary()
    }
  }, [isOpen, transcript])

  const generateSummary = async () => {
    setIsGenerating(true)
    try {
      const result = await generateMeetingSummary({
        meetingId,
        transcript,
        meetingTitle,
        participants,
        duration,
      })

      if (result.success && result.summary) {
        setSummary(result.summary)
        toast({
          title: "Summary Generated",
          description: "Your meeting summary is ready!",
        })
      } else {
        throw new Error(result.error || "Failed to generate summary")
      }
    } catch (error) {
      console.error("Error generating summary:", error)
      toast({
        title: "Summary Generation Failed",
        description: "Unable to generate meeting summary. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSendEmail = async () => {
    if (!summary) return

    setIsSendingEmail(true)
    try {
      const result = await sendSummaryEmail(summary.id, participantEmails)

      if (result.success) {
        toast({
          title: "Summary Sent",
          description: "Meeting summary has been emailed to all participants.",
        })
      } else {
        throw new Error(result.error || "Failed to send email")
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast({
        title: "Email Failed",
        description: "Unable to send summary email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const exportSummary = () => {
    if (!summary) return

    const summaryText = `
MEETING SUMMARY
===============

Meeting: ${summary.meetingTitle}
Date: ${summary.startTime.toLocaleDateString()}
Duration: ${Math.round(summary.duration / 60)} minutes
Participants: ${summary.participants.join(", ")}

KEY POINTS
----------
${summary.keyPoints.map((point) => `• ${point}`).join("\n")}

ACTION ITEMS
------------
${summary.actionItems.map((item) => `• ${item}`).join("\n")}

DECISIONS MADE
--------------
${summary.decisions.map((decision) => `• ${decision}`).join("\n")}

NEXT STEPS
----------
${summary.nextSteps.map((step) => `• ${step}`).join("\n")}

FULL SUMMARY
------------
${summary.fullSummary}

TRANSCRIPT
----------
${summary.transcript.map((t) => `[${t.timestamp.toLocaleTimeString()}] ${t.participantName}: ${t.text}`).join("\n")}
    `.trim()

    const blob = new Blob([summaryText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `meeting-summary-${summary.meetingTitle.replace(/[^a-z0-9]/gi, "-")}-${
      summary.startTime.toISOString().split("T")[0]
    }.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Meeting Summary
          </DialogTitle>
          <DialogDescription>AI-generated summary of your meeting with key points and action items</DialogDescription>
        </DialogHeader>

        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-600">Generating your meeting summary...</p>
              <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
            </div>
          </div>
        ) : summary ? (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Meeting Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{summary.meetingTitle}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {Math.round(summary.duration / 60)} minutes
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {summary.participants.length} participants
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Key Points */}
              {summary.keyPoints.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="h-4 w-4" />
                      Key Discussion Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.keyPoints.map((point, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 text-xs">
                            {index + 1}
                          </Badge>
                          <span className="text-sm">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Action Items */}
              {summary.actionItems.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" />
                      Action Items
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.actionItems.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Badge variant="secondary" className="mt-0.5 text-xs">
                            TODO
                          </Badge>
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Decisions */}
              {summary.decisions.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CheckCircle className="h-4 w-4" />
                      Decisions Made
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.decisions.map((decision, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Badge variant="default" className="mt-0.5 text-xs">
                            DECIDED
                          </Badge>
                          <span className="text-sm">{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              {summary.nextSteps.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <ArrowRight className="h-4 w-4" />
                      Next Steps
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.nextSteps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5 text-xs">
                            NEXT
                          </Badge>
                          <span className="text-sm">{step}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Full Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Full Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-700">{summary.fullSummary}</p>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">No transcript available for summary generation.</p>
          </div>
        )}

        {/* Actions */}
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {summary && (
              <>
                <Button variant="outline" onClick={exportSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" onClick={handleSendEmail} disabled={isSendingEmail}>
                  {isSendingEmail ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Email to Participants
                </Button>
              </>
            )}
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
