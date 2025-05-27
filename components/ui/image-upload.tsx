"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera, Upload, X, Loader2 } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary-client"
import { useToast } from "@/hooks/use-toast"

interface ImageUploadProps {
  currentImage?: string
  onImageChange: (url: string, publicId?: string) => void
  className?: string
  size?: "sm" | "md" | "lg"
}

export function ImageUpload({ currentImage, onImageChange, className, size = "md" }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, GIF)",
        variant: "destructive",
      })
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB",
        variant: "destructive",
      })
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)

    // Upload file
    handleUpload(file)
  }

  const handleUpload = async (file: File) => {
    setUploading(true)

    try {
      console.log("Starting upload for file:", file.name, "Size:", file.size)

      const result = await uploadToCloudinary(file)

      console.log("Upload successful:", result)

      onImageChange(result.secure_url, result.public_id)
      setPreview(null)

      toast({
        title: "Success",
        description: "Image uploaded successfully!",
      })
    } catch (error) {
      console.error("Upload error:", error)

      setPreview(null)

      let errorMessage = "Failed to upload image. Please try again."

      if (error instanceof Error) {
        if (error.message.includes("413")) {
          errorMessage = "File is too large. Please choose a smaller image."
        } else if (error.message.includes("400")) {
          errorMessage = "Invalid image format. Please use JPG, PNG, or GIF."
        } else if (error.message.includes("401")) {
          errorMessage = "Upload authentication failed. Please try again."
        } else {
          errorMessage = error.message
        }
      }

      toast({
        title: "Upload failed",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    setPreview(null)
    onImageChange("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const displayImage = preview || currentImage

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={displayImage || "/placeholder.svg"} alt="Upload preview" />
          <AvatarFallback>
            {uploading ? (
              <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            ) : (
              <Camera className="h-6 w-6 text-gray-400" />
            )}
          </AvatarFallback>
        </Avatar>

        {displayImage && !uploading && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
            onClick={handleRemove}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 text-center">Max 10MB • JPG, PNG, GIF</p>
      </div>
    </div>
  )
}
