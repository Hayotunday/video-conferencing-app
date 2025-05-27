"use client"
import { ImageUpload } from "@/components/ui/image-upload"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageIcon } from "lucide-react"

interface MeetingThumbnailProps {
  onThumbnailChange: (url: string, publicId?: string) => void
  currentThumbnail?: string
}

export function MeetingThumbnail({ onThumbnailChange, currentThumbnail }: MeetingThumbnailProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <ImageIcon className="h-4 w-4" />
          Meeting Thumbnail
        </CardTitle>
        <CardDescription className="text-xs">Add a custom thumbnail for your meeting</CardDescription>
      </CardHeader>
      <CardContent>
        <ImageUpload currentImage={currentThumbnail} onImageChange={onThumbnailChange} size="md" />
      </CardContent>
    </Card>
  )
}
