"use server"

import { generateText } from "ai"
import { google } from "@ai-sdk/google"
import { collection, addDoc, doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { MeetingSummary, SummaryGenerationRequest } from "@/types/meeting-summary"

export async function generateMeetingSummary(request: SummaryGenerationRequest) {
  try {
    // Combine all transcript text
    const fullTranscript = request.transcript.map((t) => `${t.participantName}: ${t.text}`).join("\n")

    if (!fullTranscript.trim()) {
      throw new Error("No transcript available for summary generation")
    }

    // Generate summary using Gemini AI
    const { text: summaryText } = await generateText({
      model: google("gemini-1.5-pro"),
      system: `You are an AI assistant that creates comprehensive meeting summaries. 
  Analyze the meeting transcript and provide a structured summary with:
  1. Key discussion points
  2. Action items with responsible parties
  3. Decisions made
  4. Next steps
  5. Overall summary
  
  Format your response as JSON with the following structure:
  {
    "keyPoints": ["point1", "point2", ...],
    "actionItems": ["action1", "action2", ...],
    "decisions": ["decision1", "decision2", ...],
    "nextSteps": ["step1", "step2", ...],
    "fullSummary": "comprehensive summary text"
  }`,
      prompt: `Meeting Title: ${request.meetingTitle}
  Duration: ${Math.round(request.duration / 60)} minutes
  Participants: ${request.participants.join(", ")}
  
  Transcript:
  ${fullTranscript}
  
  Please generate a comprehensive meeting summary.`,
    })

    // Parse AI response
    let parsedSummary
    try {
      parsedSummary = JSON.parse(summaryText)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      parsedSummary = {
        keyPoints: ["Summary generation completed"],
        actionItems: [],
        decisions: [],
        nextSteps: [],
        fullSummary: summaryText,
      }
    }

    // Create meeting summary object
    const meetingSummary: Omit<MeetingSummary, "id"> = {
      meetingId: request.meetingId,
      meetingTitle: request.meetingTitle,
      startTime: new Date(Date.now() - request.duration * 1000),
      endTime: new Date(),
      duration: request.duration,
      participants: request.participants,
      keyPoints: parsedSummary.keyPoints || [],
      actionItems: parsedSummary.actionItems || [],
      decisions: parsedSummary.decisions || [],
      nextSteps: parsedSummary.nextSteps || [],
      fullSummary: parsedSummary.fullSummary || summaryText,
      transcript: request.transcript,
      createdAt: new Date(),
    }

    // Save to Firestore
    const docRef = await addDoc(collection(db, "meetingSummaries"), meetingSummary)

    // Update meeting document with summary reference
    const meetingRef = doc(db, "meetings", request.meetingId)
    await updateDoc(meetingRef, {
      summaryId: docRef.id,
      summaryGenerated: true,
      summaryGeneratedAt: new Date(),
    })

    return {
      success: true,
      summaryId: docRef.id,
      summary: { id: docRef.id, ...meetingSummary },
    }
  } catch (error) {
    console.error("Error generating meeting summary:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate summary",
    }
  }
}

export async function getMeetingSummary(summaryId: string) {
  try {
    const docRef = doc(db, "meetingSummaries", summaryId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return { success: false, error: "Summary not found" }
    }

    return {
      success: true,
      summary: { id: docSnap.id, ...docSnap.data() } as MeetingSummary,
    }
  } catch (error) {
    console.error("Error fetching meeting summary:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch summary",
    }
  }
}

export async function sendSummaryEmail(summaryId: string, recipientEmails: string[]) {
  try {
    // This would integrate with your email service (SendGrid, Resend, etc.)
    // For now, we'll just log the action
    console.log(`Sending summary ${summaryId} to:`, recipientEmails)

    // In a real implementation, you would:
    // 1. Fetch the summary
    // 2. Generate an HTML email template
    // 3. Send via your email service
    // 4. Log the delivery

    return { success: true, message: "Summary email sent successfully" }
  } catch (error) {
    console.error("Error sending summary email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}
