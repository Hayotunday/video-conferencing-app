export interface MeetingTranscript {
  id: string
  meetingId: string
  participantId: string
  participantName: string
  timestamp: Date
  text: string
  confidence?: number
}

export interface MeetingSummary {
  id: string
  meetingId: string
  meetingTitle: string
  startTime: Date
  endTime: Date
  duration: number
  participants: string[]
  keyPoints: string[]
  actionItems: string[]
  decisions: string[]
  nextSteps: string[]
  fullSummary: string
  transcript: MeetingTranscript[]
  createdAt: Date
}

export interface SummaryGenerationRequest {
  meetingId: string
  transcript: MeetingTranscript[]
  meetingTitle: string
  participants: string[]
  duration: number
}
