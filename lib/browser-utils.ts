export function checkBrowserCapabilities() {
  if (typeof window === "undefined") {
    return {
      isSecureContext: false,
      hasGetDisplayMedia: false,
      hasGetUserMedia: false,
      supportsScreenShare: false,
      supportsWebRTC: false,
    }
  }

  const isSecureContext =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "0.0.0.0"

  const hasGetDisplayMedia = navigator.mediaDevices && typeof navigator.mediaDevices.getDisplayMedia === "function"

  const hasGetUserMedia = navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function"

  const supportsWebRTC = typeof RTCPeerConnection !== "undefined"

  const supportsScreenShare = isSecureContext && hasGetDisplayMedia

  return {
    isSecureContext,
    hasGetDisplayMedia,
    hasGetUserMedia,
    supportsScreenShare,
    supportsWebRTC,
  }
}

export function getScreenShareErrorMessage(error: any): string {
  if (!error) return "Unknown error occurred"

  const message = error.message || error.toString()

  if (message.includes("Permission denied") || message.includes("NotAllowedError")) {
    return "Screen sharing permission was denied. Please allow screen sharing and try again."
  }

  if (message.includes("NotSupportedError")) {
    return "Screen sharing is not supported in this browser."
  }

  if (message.includes("display-capture") || message.includes("disallowed by permissions policy")) {
    return "Screen sharing is blocked by browser policy. Please use HTTPS or localhost."
  }

  if (message.includes("AbortError")) {
    return "Screen sharing was cancelled by the user."
  }

  if (message.includes("NotFoundError")) {
    return "No screen sharing source was found."
  }

  if (message.includes("NotReadableError")) {
    return "Screen sharing source is not readable."
  }

  return "Failed to start screen sharing. Please try again."
}
