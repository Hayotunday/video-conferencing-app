import { getCloudinaryUploadParams } from "@/app/actions/upload"

interface CloudinaryUploadResponse {
  secure_url: string
  public_id: string
  width: number
  height: number
}

export async function uploadToCloudinary(file: File): Promise<CloudinaryUploadResponse> {
  try {
    // Get upload parameters from server
    const paramsResult = await getCloudinaryUploadParams()

    if (!paramsResult.success) {
      throw new Error(paramsResult.error || "Failed to get upload parameters")
    }

    const { cloudName, apiKey, timestamp, signature, folder, transformation } = paramsResult

    // Create form data for upload
    const formData = new FormData()
    formData.append("file", file)
    formData.append("api_key", apiKey)
    formData.append("timestamp", timestamp.toString())
    formData.append("signature", signature)
    formData.append("folder", folder)
    formData.append("transformation", transformation)

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error("Cloudinary upload error:", errorData)
      throw new Error(`Upload failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()

    if (result.error) {
      throw new Error(result.error.message || "Upload failed")
    }

    return result
  } catch (error) {
    console.error("Upload to Cloudinary failed:", error)
    throw error
  }
}
