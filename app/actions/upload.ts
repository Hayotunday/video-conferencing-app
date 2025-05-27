"use server"

export async function getCloudinaryUploadParams() {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
    const apiKey = process.env.CLOUDINARY_API_KEY!
    const apiSecret = process.env.CLOUDINARY_API_SECRET!

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error("Cloudinary credentials not found")
    }

    const timestamp = Math.round(new Date().getTime() / 1000)

    // Parameters to sign
    const params = {
      timestamp: timestamp.toString(),
      folder: "video-conference-app",
      transformation: "w_400,h_400,c_fill,g_face,q_auto,f_auto",
    }

    // Create string to sign
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key as keyof typeof params]}`)
      .join("&")

    const stringToSign = `${sortedParams}${apiSecret}`

    // Create signature using Web Crypto API
    const encoder = new TextEncoder()
    const data = encoder.encode(stringToSign)

    // Use SHA-1 for Cloudinary signature
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    return {
      success: true,
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder: params.folder,
      transformation: params.transformation,
    }
  } catch (error) {
    console.error("Error generating Cloudinary params:", error)
    return { success: false, error: "Failed to generate upload parameters" }
  }
}

export async function deleteCloudinaryImage(publicId: string) {
  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!
    const apiKey = process.env.CLOUDINARY_API_KEY!
    const apiSecret = process.env.CLOUDINARY_API_SECRET!

    const timestamp = Math.round(new Date().getTime() / 1000)
    const stringToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`

    // Create signature
    const encoder = new TextEncoder()
    const data = encoder.encode(stringToSign)
    const hashBuffer = await crypto.subtle.digest("SHA-1", data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    // Make deletion request
    const formData = new FormData()
    formData.append("public_id", publicId)
    formData.append("timestamp", timestamp.toString())
    formData.append("api_key", apiKey)
    formData.append("signature", signature)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: "POST",
      body: formData,
    })

    const result = await response.json()

    if (result.result === "ok") {
      return { success: true }
    } else {
      throw new Error("Deletion failed")
    }
  } catch (error) {
    console.error("Error deleting image:", error)
    return { success: false, error: "Failed to delete image" }
  }
}
