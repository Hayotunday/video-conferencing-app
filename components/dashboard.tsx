"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import {
  Video,
  Plus,
  LogOut,
  Users,
  Settings,
  Share2,
  Home,
} from "lucide-react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProfileSettings } from "@/components/profile-settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MeetingThumbnail } from "@/components/meeting-thumbnail";
import { MeetingShare } from "@/components/meeting-share";
import { CopyButton } from "@/components/copy-button";
import { BrowserCompatibility } from "@/components/browser-compatibility";
import { DateTimeDisplay } from "@/components/date-time-display";
import { useToast } from "@/hooks/use-toast";
import { MeetingWrapper } from "@/components/meeting-wrapper";
import { JoinMeetingCard } from "./join-meeting-card";
import CreateMeetingcard from "./create-meeting-card";

interface Meeting {
  id: string;
  title: string;
  roomId: string;
  createdBy: string;
  createdAt: any;
  participants: string[];
  thumbnail?: string;
}

export function Dashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [meetingThumbnail, setMeetingThumbnail] = useState("");
  const [activeMeetingRoom, setActiveMeetingRoom] = useState<string | null>(
    null
  );

  // Stable user ID reference
  const userId = user?.uid;

  // Memoized fallback function
  const loadMeetingsSimple = useCallback(async () => {
    if (!userId) return;

    try {
      const meetingsRef = collection(db, "meetings");
      const snapshot = await getDocs(meetingsRef);
      const allMeetings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Meeting[];

      // Filter on client side
      const userMeetings = allMeetings.filter((meeting) =>
        meeting.participants?.includes(userId)
      );

      // Sort on client side
      const sortedMeetings = userMeetings.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
        const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
        return bTime.getTime() - aTime.getTime();
      });

      setMeetings(sortedMeetings);
    } catch (error) {
      console.error("Error loading meetings:", error);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    // Simplified query without orderBy to avoid index requirement
    const q = query(
      collection(db, "meetings"),
      where("participants", "array-contains", userId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const meetingsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Meeting[];

        // Sort on client side instead of using Firestore orderBy
        const sortedMeetings = meetingsData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return bTime.getTime() - aTime.getTime();
        });

        setMeetings(sortedMeetings);
      },
      (error) => {
        console.error("Error fetching meetings:", error);
        // Fallback to a simple query without array-contains if needed
        loadMeetingsSimple();
      }
    );

    return unsubscribe;
  }, [userId, loadMeetingsSimple]);

  useEffect(() => {
    if (!userId) return;

    const loadUserProfile = async () => {
      try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      }
    };

    loadUserProfile();
  }, [userId]);

  const handleThumbnailChange = useCallback(
    (url: string, publicId?: string) => {
      setMeetingThumbnail(url);
    },
    []
  );

  const createMeeting = useCallback(async () => {
    if (!userId || !newMeetingTitle.trim()) return;

    setLoading(true);
    try {
      const roomId = `room_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await addDoc(collection(db, "meetings"), {
        title: newMeetingTitle,
        roomId,
        thumbnail: meetingThumbnail,
        createdBy: userId,
        createdAt: new Date(),
        participants: [userId],
      });

      setNewMeetingTitle("");
      setMeetingThumbnail("");

      toast({
        title: "Meeting created",
        description: "Meeting link is ready to share!",
      });

      // Set active meeting room to show the meeting component
      setActiveMeetingRoom(roomId);
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast({
        title: "Error",
        description: "Failed to create meeting. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [userId, newMeetingTitle, meetingThumbnail, toast]);

  const joinMeeting = useCallback((roomId: string) => {
    console.log("Joining meeting with room ID:", roomId);
    setActiveMeetingRoom(roomId);
  }, []);

  const leaveMeeting = useCallback(() => {
    console.log("Leaving meeting, returning to dashboard");
    setActiveMeetingRoom(null);

    // Optional: Add a small delay to ensure cleanup is complete
    setTimeout(() => {
      console.log("Meeting cleanup complete");
    }, 100);
  }, []);

  const toggleProfile = useCallback(() => {
    setShowProfile((prev) => !prev);
  }, []);

  // Memoized user display info
  const userDisplayInfo = useMemo(() => {
    return {
      avatar: userProfile?.profileImage || "/placeholder.svg",
      initial: (user?.displayName || user?.email || "U")
        .charAt(0)
        .toUpperCase(),
      name: userProfile?.displayName || user?.displayName || user?.email,
    };
  }, [
    userProfile?.profileImage,
    userProfile?.displayName,
    user?.displayName,
    user?.email,
  ]);

  // If there's an active meeting room, show the meeting component
  if (activeMeetingRoom) {
    return (
      <div className="relative h-screen">
        <MeetingWrapper roomId={activeMeetingRoom} onLeave={leaveMeeting} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Video className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Talk</h1>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={userDisplayInfo.avatar || "/placeholder.svg"}
                alt="Profile"
              />
              <AvatarFallback>{userDisplayInfo.initial}</AvatarFallback>
            </Avatar>
            <span className="text-sm text-gray-600">
              Welcome, {userDisplayInfo.name}
            </span>
            <Button variant="outline" size="sm" onClick={toggleProfile}>
              {showProfile ? (
                <>
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </>
              ) : (
                <>
                  <Settings className="h-4 w-4 mr-2" />
                  Profile
                </>
              )}
            </Button>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Browser Compatibility Warning */}
        <BrowserCompatibility />

        {showProfile ? (
          <div className="max-w-md mx-auto">
            <ProfileSettings />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {/* Date and Time Display */}
              <DateTimeDisplay />

              {/* Create Meeting Card */}
              <CreateMeetingcard
                newMeetingTitle={newMeetingTitle}
                setNewMeetingTitle={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewMeetingTitle(e.target.value)
                }
                meetingThumbnail={meetingThumbnail}
                handleThumbnailChange={handleThumbnailChange}
                createMeeting={createMeeting}
                loading={loading}
              />

              {/* Join Meeting Card */}
              <JoinMeetingCard onJoinMeeting={joinMeeting} />
            </div>

            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Your Meetings
                  </CardTitle>
                  <CardDescription>
                    Recent and upcoming meetings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {meetings.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No meetings yet. Create your first meeting!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {meetings.map((meeting) => (
                        <div
                          key={meeting.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            {meeting.thumbnail && (
                              <img
                                src={meeting.thumbnail || "/placeholder.svg"}
                                alt="Meeting thumbnail"
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-medium">{meeting.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-sm text-gray-500">
                                  ID: {meeting.roomId}
                                </p>
                                <CopyButton
                                  text={meeting.roomId}
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                />
                              </div>
                              <p className="text-xs text-gray-400">
                                Created:{" "}
                                {meeting.createdAt
                                  ?.toDate?.()
                                  ?.toLocaleDateString() || "Unknown"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <MeetingShare
                              roomId={meeting.roomId}
                              title={meeting.title}
                            >
                              <Button variant="outline" size="sm">
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </MeetingShare>
                            <Button
                              onClick={() => joinMeeting(meeting.roomId)}
                              size="sm"
                            >
                              Join
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
