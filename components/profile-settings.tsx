"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUpload } from "@/components/ui/image-upload"
import { useAuth } from "@/contexts/auth-context"
import { doc, updateDoc, getDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useToast } from "@/hooks/use-toast"
import { User, Save } from "lucide-react"

interface UserProfile {
  displayName: string
  profileImage: string
  profileImagePublicId?: string
}

export function ProfileSettings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    profileImage: "",
    profileImagePublicId: "",
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      setLoading(true)
      try {
        const docRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(docRef)

        if (docSnap.exists()) {
          const data = docSnap.data()
          setProfile({
            displayName: data.displayName || "",
            profileImage: data.profileImage || "",
            profileImagePublicId: data.profileImagePublicId || "",
          })
        }
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [user])

  const handleImageChange = (url: string, publicId?: string) => {
    setProfile((prev) => ({
      ...prev,
      profileImage: url,
      profileImagePublicId: publicId || "",
    }))
  }

  const handleSave = async () => {
    if (!user) return

    setSaving(true)
    try {
      const docRef = doc(db, "users", user.uid)
      await updateDoc(docRef, {
        displayName: profile.displayName,
        profileImage: profile.profileImage,
        profileImagePublicId: profile.profileImagePublicId,
        updatedAt: new Date(),
      })

      toast({
        title: "Success",
        description: "Profile updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading profile...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Settings
        </CardTitle>
        <CardDescription>Update your profile information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-center">
          <ImageUpload currentImage={profile.profileImage} onImageChange={handleImageChange} size="lg" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={profile.displayName}
            onChange={(e) => setProfile((prev) => ({ ...prev, displayName: e.target.value }))}
            placeholder="Enter your display name"
          />
        </div>

        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled />
          <p className="text-xs text-gray-500">Email cannot be changed</p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
