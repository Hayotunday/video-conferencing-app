export function generateMeetingLink(roomId: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/meeting/${roomId}`
  }
  return `/meeting/${roomId}`
}

export function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false)

  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => false)
  } else {
    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    textArea.style.top = "-999999px"
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand("copy")
      document.body.removeChild(textArea)
      return Promise.resolve(successful)
    } catch (err) {
      document.body.removeChild(textArea)
      return Promise.resolve(false)
    }
  }
}

export function shareMeetingLink(roomId: string, title: string): void {
  const meetingLink = generateMeetingLink(roomId)

  if (navigator.share) {
    navigator
      .share({
        title: `Join ${title}`,
        text: `You're invited to join "${title}" video conference`,
        url: meetingLink,
      })
      .catch((error) => {
        console.log("Error sharing:", error)
      })
  } else {
    // Fallback: copy to clipboard
    copyToClipboard(meetingLink)
  }
}
