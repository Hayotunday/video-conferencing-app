"use server"

export async function generateStreamToken(userId: string) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!
    const secret = process.env.STREAM_SECRET_KEY!

    if (!apiKey || !secret) {
      throw new Error("Stream API key or secret not found")
    }

    // Create JWT token manually using Web Crypto API
    const header = {
      alg: "HS256",
      typ: "JWT",
    }

    const payload = {
      user_id: userId,
      iss: apiKey,
      sub: userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
    }

    // Base64URL encode
    const base64UrlEncode = (obj: any) => {
      return Buffer.from(JSON.stringify(obj))
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "")
    }

    const encodedHeader = base64UrlEncode(header)
    const encodedPayload = base64UrlEncode(payload)
    const data = `${encodedHeader}.${encodedPayload}`

    // Create signature using HMAC SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const algorithm = { name: "HMAC", hash: "SHA-256" }

    const cryptoKey = await crypto.subtle.importKey("raw", keyData, algorithm, false, ["sign"])

    const signature = await crypto.subtle.sign(algorithm, cryptoKey, encoder.encode(data))

    const base64Signature = Buffer.from(signature)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")

    const token = `${data}.${base64Signature}`

    return { success: true, token }
  } catch (error) {
    console.error("Error generating Stream token:", error)
    return { success: false, error: "Failed to generate token" }
  }
}
