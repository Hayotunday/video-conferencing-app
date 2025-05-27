"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Database } from "lucide-react"

export function SetupInstructions() {
  const indexUrl =
    "https://console.firebase.google.com/v1/r/project/talkvideoconference/firestore/indexes?create_composite=ClRwcm9qZWN0cy90YWxrdmlkZW9jb25mZXJlbmNlL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9tZWV0aW5ncy9pbmRleGVzL18QARoQCgxwYXJ0aWNpcGFudHMYARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC"

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Firestore Index Setup Required
        </CardTitle>
        <CardDescription>To enable meeting queries, you need to create a composite index in Firestore.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Quick Setup:</h4>
          <p className="text-sm text-gray-600 mb-3">
            Click the button below to automatically create the required index in Firebase Console.
          </p>
          <Button asChild>
            <a href={indexUrl} target="_blank" rel="noopener noreferrer">
              Create Index Automatically
              <ExternalLink className="h-4 w-4 ml-2" />
            </a>
          </Button>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2">Manual Setup:</h4>
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>Go to Firebase Console → Firestore Database → Indexes</li>
            <li>Click "Create Index"</li>
            <li>Set Collection ID: "meetings"</li>
            <li>Add field: "participants" (Arrays)</li>
            <li>Add field: "createdAt" (Descending)</li>
            <li>Click "Create"</li>
          </ol>
        </div>

        <p className="text-xs text-gray-500">
          Note: Index creation may take a few minutes. The app will work with basic functionality until the index is
          ready.
        </p>
      </CardContent>
    </Card>
  )
}
