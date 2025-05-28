// c:\Work\video-conferencing-app\components\meeting-wrapper.tsx
"use client"; // Specifies this as a Client Component for Next.js App Router

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation"; // For programmatic navigation
import { useStreamClient } from "@/contexts/stream-context"; // Custom hook to get Stream client
import { useAuth } from "@/contexts/auth-context"; // Custom hook for user authentication
import { VideoCall } from "@/components/video-call"; // The actual video call UI component
import type { Call } from "@stream-io/video-react-sdk"; // Type for Stream Call object
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from "lucide-react"; // Icons
import { Button } from "@/components/ui/button"; // UI component
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // UI components for error display

// --- Global Caches ---
// These Maps are defined outside the component, so they persist across re-renders
// and even if the MeetingWrapper component unmounts and remounts for the same room.

// `callCache`: Stores active Stream Call objects to reuse them if the user
// navigates away and back to the same meeting room quickly.
// Key: string (e.g., `${userId}-${roomId}`)
// Value: Call (Stream Call object)
const callCache = new Map<string, Call>();

// `callStateCache`: Stores the join/left state of a call. This helps prevent
// trying to join an already joined call or leave a call that's already been left.
// Key: string (e.g., `${userId}-${roomId}`)
// Value: { isJoined: boolean; hasLeft: boolean }
const callStateCache = new Map<
  string,
  { isJoined: boolean; hasLeft: boolean }
>();

interface MeetingWrapperProps {
  roomId: string; // The ID of the meeting room to join
  onLeave?: () => void; // Optional callback when the user leaves the call
}

export function MeetingWrapper({ roomId, onLeave }: MeetingWrapperProps) {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user info
  const {
    client, // The Stream Video client instance
    isLoading: streamLoading, // True if the Stream client is initializing
    error: streamError, // Error message from Stream client initialization
    retryConnection, // Function to retry Stream client connection
    isReady, // True if the Stream client is ready for use
  } = useStreamClient();

  // --- Component State ---
  const [call, setCall] = useState<Call | null>(null); // Holds the current Stream Call object
  const [callError, setCallError] = useState<string | null>(null); // Error specific to call creation/joining
  const [isInitializing, setIsInitializing] = useState(false); // True when creating/fetching a new call
  const [isJoiningCall, setIsJoiningCall] = useState(false); // True when call.join() is in progress
  const [mounted, setMounted] = useState(false); // Tracks if the component has mounted (first render cycle)

  // --- Refs ---
  // Refs are used to store mutable values that do not trigger re-renders when changed.
  // They are also useful for accessing underlying DOM elements or, in this case,
  // for managing flags across async operations and effect cleanup.

  // `initializingRef`: Prevents `initCall` from running multiple times simultaneously.
  const initializingRef = useRef(false);
  // `mountedRef`: A more reliable way to check if the component is still mounted,
  // especially in async callbacks or cleanup functions, to prevent state updates
  // on unmounted components.
  const mountedRef = useRef(true);

  // Stable reference to userId to avoid unnecessary re-runs of effects/callbacks
  const userId = user?.uid;

  // Effect to manage the mounted state (both state and ref)
  useEffect(() => {
    setMounted(true); // Set state to true after the first render
    mountedRef.current = true; // Set ref to true

    // Cleanup function: runs when the component unmounts
    return () => {
      mountedRef.current = false; // Set ref to false on unmount
    };
  }, []); // Empty dependency array: runs only once after initial render and on unmount

  // --- Core Call Logic Functions ---

  /**
   * `leaveCall`: Handles the process of leaving a Stream call.
   * - Checks `callStateCache` to see if the call was already left.
   * - Calls `callInstance.leave()` if the call was marked as joined.
   * - Updates `callStateCache` based on the outcome.
   * - Handles errors, including specific "already left" errors.
   */
  const leaveCall = useCallback(
    async (callInstance: Call, cacheKey: string) => {
      if (!callInstance) {
        console.warn(
          `MeetingWrapper: leaveCall invoked with null callInstance for cacheKey: ${cacheKey}`
        );
        return;
      }
      const callState = callStateCache.get(cacheKey);

      if (callState?.hasLeft) {
        console.log(
          `MeetingWrapper: Call ${callInstance.id} (cacheKey: ${cacheKey}) already marked as left. Skipping leave.`
        );
        return;
      }

      try {
        console.log(
          `MeetingWrapper: Attempting to leave call ${callInstance.id} (cacheKey: ${cacheKey}). Current cached joined state: ${callState?.isJoined}`
        );

        // Only attempt to leave if the cache indicates the call was joined.
        // Stream's call.leave() is generally idempotent, but this adds a layer of control.
        if (callState?.isJoined) {
          await callInstance.leave();
          console.log(
            `MeetingWrapper: Successfully left call ${callInstance.id} (cacheKey: ${cacheKey}).`
          );
          // Update cache AFTER successful leave
          callStateCache.set(cacheKey, {
            isJoined: false,
            hasLeft: true,
          });
        }
        // If callState.isJoined was false, but callState.hasLeft was also false,
        // it implies we never successfully joined or an intermediate state.
        // In this case, we might still want to mark it as 'left' to prevent future join attempts
        // if the call object itself exists. However, the current logic only leaves if `isJoined` was true.
      } catch (error: any) {
        console.error(
          `MeetingWrapper: Error during leaveCall for ${callInstance.id} (cacheKey: ${cacheKey}):`,
          error
        );
        // If the error indicates the call was already left, update cache accordingly.
        if (
          error.message?.includes("already been left") ||
          error.message?.includes("Call has already been ended") ||
          error.message?.includes("call has already been terminated")
        ) {
          console.log(
            `MeetingWrapper: Call ${callInstance.id} (cacheKey: ${cacheKey}) was already left (confirmed by error). Updating cache.`
          );
          callStateCache.set(cacheKey, {
            isJoined: false,
            hasLeft: true,
          });
        } else {
          // For other errors, the leave was not successful.
          // Resetting `hasLeft` to false might allow retries but could also indicate an uncertain state.
          console.warn(
            `MeetingWrapper: Call ${callInstance.id} (cacheKey: ${cacheKey}) leave failed with an unexpected error. Resetting cache state.`
          );
          callStateCache.set(cacheKey, {
            isJoined: false, // Unsure of joined state if leave failed
            hasLeft: false,
          });
        }
      }
    },
    [] // No dependencies, so this function is memoized and stable
  );

  /**
   * `joinCall`: Handles the process of joining an existing Stream call instance.
   * - Checks `callStateCache` to prevent re-joining.
   * - Enables camera and microphone.
   * - Calls `callInstance.join()`.
   * - Updates `callStateCache` on success.
   * - Handles errors, including specific permission/device errors.
   */
  const joinCall = useCallback(
    async (callInstance: Call, cacheKey: string) => {
      const callState = callStateCache.get(cacheKey);

      if (callState?.isJoined || isJoiningCall) {
        console.log(
          `MeetingWrapper: Call ${callInstance.id} (cacheKey: ${cacheKey}) already joined or joining in progress. Skipping join.`
        );
        return;
      }

      if (mountedRef.current) setIsJoiningCall(true);
      try {
        console.log(
          `MeetingWrapper: Joining call ${callInstance.id} (cacheKey: ${cacheKey})...`
        );

        await callInstance.camera.enable();
        await callInstance.microphone.enable();
        await callInstance.join();

        if (mountedRef.current) {
          callStateCache.set(cacheKey, {
            isJoined: true,
            hasLeft: false,
          });
        }
        console.log(
          "Successfully joined call with camera and microphone enabled"
        );
      } catch (error: any) {
        console.error(
          `MeetingWrapper: Error joining call ${callInstance.id} (cacheKey: ${cacheKey}):`,
          error
        );

        if (mountedRef.current) {
          let userMessage = "Failed to join the call. Please try again.";
          let specificErrorDetail = "An unknown error occurred.";

          // Provide more specific error messages for common device/permission issues
          if (error && typeof error.message === "string") {
            const errorMessage = error.message.toLowerCase();
            specificErrorDetail = error.message; // Capture the original Stream error message

            if (
              errorMessage.includes("permission denied") ||
              errorMessage.includes("notallowederror")
            ) {
              userMessage =
                "Camera/Microphone access denied. Please check your browser permissions and try again.";
            } else if (
              errorMessage.includes("failed to get video stream") ||
              errorMessage.includes("notreadableerror") ||
              errorMessage.includes("device not found") ||
              errorMessage.includes("no camera available") ||
              errorMessage.includes("unable to capture video")
            ) {
              userMessage =
                "Could not access your camera. Please ensure it's connected, not in use by another app, and check system settings.";
            } else if (
              errorMessage.includes("microphone") ||
              errorMessage.includes("unable to capture audio")
            ) {
              userMessage =
                "Could not access your microphone. Please ensure it's connected, not in use by another app, and check system settings.";
            } else if (
              errorMessage.includes("call has already been ended") ||
              errorMessage.includes("call has already been terminated")
            ) {
              userMessage = "This meeting has already ended.";
            } else if (errorMessage.includes("call does not exist")) {
              userMessage = "This meeting room does not exist.";
            }
          }

          // Log the specific Stream error message for debugging purposes
          console.error(`Stream SDK Error Detail: ${specificErrorDetail}`);

          setCallError(userMessage);
          // Reflect failed join attempt in cache
          callStateCache.set(cacheKey, {
            isJoined: false,
            hasLeft: false, // Or preserve previous hasLeft if applicable and known
          });
        }
      } finally {
        if (mountedRef.current) {
          setIsJoiningCall(false);
        }
      }
    },
    [isJoiningCall] // Depends on `isJoiningCall` to prevent concurrent joins
  );

  /**
   * `initCall`: The main function to initialize or retrieve a call.
   * - Checks preconditions (client, roomId, userId, isReady, etc.).
   * - Generates a `cacheKey`.
   * - Tries to retrieve the call from `callCache`. If found, sets it and attempts to join if necessary.
   * - If not cached, creates a new call using `client.call()`.
   * - Calls `newCall.getOrCreate()` to ensure the call exists on the Stream backend.
   * - Caches the new call in `callCache` and `callStateCache`.
   * - Sets the new call to state and then calls `joinCall`.
   * - Manages `isInitializing` state and `initializingRef`.
   * - Handles errors during call creation, including rate limiting.
   */
  const initCall = useCallback(async () => {
    // Preconditions to prevent unnecessary execution
    if (
      !client || // Stream client must exist
      !roomId || // Room ID must be provided
      !userId || // User must be authenticated
      !isReady || // Stream client must be ready
      initializingRef.current || // Avoid concurrent initializations
      !mounted // Component must be mounted (using state, could use mountedRef.current)
    ) {
      return;
    }

    const cacheKey = `${userId}-${roomId}`;
    const cachedCall = callCache.get(cacheKey);

    if (cachedCall) {
      console.log(
        `MeetingWrapper: Using cached call ${cachedCall.id} for room ${roomId} (cacheKey: ${cacheKey})`
      );
      if (mountedRef.current) {
        setCall(cachedCall);
        const callState = callStateCache.get(cacheKey);
        // Attempt to join only if not already joined and not already left
        if (!callState?.isJoined && !callState?.hasLeft) {
          joinCall(cachedCall, cacheKey);
        }
      }
      return; // Exit if call is successfully retrieved from cache
    }

    // If call not in cache, proceed to create a new one
    initializingRef.current = true; // Set flag to prevent re-entry
    if (mountedRef.current) {
      setIsInitializing(true);
      setCallError(null); // Clear previous errors
    }

    try {
      console.log(
        `MeetingWrapper: Creating new call for room ${roomId} (cacheKey: ${cacheKey})`
      );
      const newCall = client.call("default", roomId); // Create a local Call object

      // This ensures the call exists on Stream's backend.
      // `created_by_id` is custom data associated with the call.
      await newCall.getOrCreate({
        data: {
          custom: {
            // Nest custom data under the 'custom' property
            created_by_id: userId,
          },
        },
      });

      // Store the newly created call in caches
      callCache.set(cacheKey, newCall);
      callStateCache.set(cacheKey, {
        isJoined: false,
        hasLeft: false,
      });

      if (mountedRef.current) {
        setCall(newCall); // Set the new call to component state
        joinCall(newCall, cacheKey); // Attempt to join the new call
      }
    } catch (error: any) {
      console.error(
        `MeetingWrapper: Error creating/getting call for room ${roomId} (cacheKey: ${cacheKey}):`,
        error
      );
      if (mountedRef.current) {
        let errorMessage = "Failed to create or get the meeting.";
        // Handle specific error types, like rate limiting
        if (
          error?.status === 429 ||
          error?.message?.toLowerCase().includes("rate") ||
          error?.message?.toLowerCase().includes("too many requests")
        ) {
          errorMessage =
            "Too many requests. Please wait a moment before trying again.";
        } else if (error?.message) {
          errorMessage = error.message; // Use the error message from the exception
        }
        setCallError(errorMessage);
      }
    } finally {
      // Reset flags regardless of success or failure
      if (mountedRef.current) {
        setIsInitializing(false);
      }
      initializingRef.current = false;
    }
  }, [client, roomId, userId, isReady, mounted, joinCall]); // Dependencies for `initCall`

  // --- Effects for Lifecycle Management ---

  // Effect to trigger `initCall` when its dependencies are met and change.
  useEffect(() => {
    if (mounted && isReady && client && userId) {
      initCall();
    }
    // This effect implicitly depends on `initCall` itself.
    // If `initCall`'s dependencies change, `initCall` gets a new reference,
    // and this effect re-runs.
  }, [mounted, isReady, client, userId, initCall]);

  // Cleanup effect: Ensures the call is left when the component unmounts
  // or when critical identifiers like `call`, `userId`, or `roomId` change.
  useEffect(() => {
    const callInstanceForCleanup = call; // Capture current call instance
    const currentUserId = userId;
    const currentRoomId = roomId;

    return () => {
      // This cleanup runs when the component unmounts OR when any dependency in the
      // dependency array `[call, userId, roomId, leaveCall]` changes.
      if (callInstanceForCleanup && currentUserId && currentRoomId) {
        const cacheKey = `${currentUserId}-${currentRoomId}`;
        console.log(
          `MeetingWrapper: Cleanup effect for call ${callInstanceForCleanup.id} (cacheKey: ${cacheKey}). Attempting to leave.`
        );
        // `leaveCall` is memoized and safe to call here.
        // It internally checks `mountedRef` before setting state, but its primary
        // role here is to interact with the Stream SDK and update global caches.
        leaveCall(callInstanceForCleanup, cacheKey);
      }
    };
  }, [call, userId, roomId, leaveCall]); // `leaveCall` is stable due to `useCallback([])`

  // --- Event Handlers ---

  /**
   * `handleLeaveCall`: User-initiated action to leave the call.
   * - Calls `leaveCall`.
   * - Clears the call from `callCache` and `callStateCache` (full cleanup for explicit leave).
   * - Invokes `onLeave` callback or navigates to dashboard.
   */
  const handleLeaveCall = useCallback(() => {
    if (call && userId) {
      const cacheKey = `${userId}-${roomId}`;
      console.log(
        `MeetingWrapper: User initiated leave for call ${call.id} (cacheKey: ${cacheKey}).`
      );
      leaveCall(call, cacheKey).then(() => {
        // After attempting to leave, clear from caches for an explicit user leave.
        // This ensures that if they rejoin the same room, it's a fresh start.
        callCache.delete(cacheKey);
        callStateCache.delete(cacheKey);

        if (onLeave) {
          onLeave();
        } else {
          router.push("/dashboard");
        }
      });
    } else {
      // If no call object, just navigate.
      console.log(
        "MeetingWrapper: handleLeaveCall invoked but no active call or user. Navigating."
      );
      if (onLeave) {
        onLeave();
      } else {
        router.push("/dashboard");
      }
    }
  }, [call, userId, roomId, leaveCall, onLeave, router]);

  /**
   * `handleRetry`: Retries the call initialization process.
   */
  const handleRetry = useCallback(() => {
    if (mountedRef.current) {
      setCallError(null); // Clear previous call error
      // `initCall` will be re-triggered by its dependency changes or by direct call
      // if its conditions are met. Here, we explicitly call it.
      initCall();
    }
  }, [initCall]);

  /**
   * `handleRetryStream`: Retries the Stream client connection.
   */
  const handleRetryStream = useCallback(() => {
    retryConnection(); // Function from `useStreamClient`
  }, [retryConnection]);

  /**
   * `handleBackToDashboard`: Navigates the user back, typically from an error screen.
   */
  const handleBackToDashboard = useCallback(() => {
    if (onLeave) {
      onLeave(); // Use onLeave callback if provided
    } else {
      router.push("/dashboard");
    }
  }, [onLeave, router]);

  // --- Memoized Error State for UI ---
  // Consolidates `streamError` and `callError` into a single object for easier rendering.
  const errorState = useMemo(() => {
    if (streamError) {
      return {
        type: "stream", // Indicates error from Stream client initialization
        isRateLimit:
          streamError.toLowerCase().includes("rate") ||
          streamError.includes("429"),
        message: streamError,
      };
    }
    if (callError) {
      return {
        type: "call", // Indicates error from call creation/joining
        isRateLimit:
          callError.toLowerCase().includes("rate") ||
          callError.toLowerCase().includes("too many requests"),
        message: callError,
      };
    }
    return null; // No error
  }, [streamError, callError]);

  // --- Conditional Rendering Logic ---

  // Initial loading state before the component has fully mounted.
  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading meeting...</p>
        </div>
      </div>
    );
  }

  // Loading states for Stream client, call initialization, or joining.
  if (streamLoading || isInitializing || isJoiningCall) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>
            {streamLoading
              ? "Initializing video service..."
              : isInitializing
              ? "Creating meeting room..."
              : "Joining meeting..."}
          </p>
          {roomId && (
            <p className="text-sm text-gray-400 mt-2">Meeting ID: {roomId}</p>
          )}
        </div>
      </div>
    );
  }

  // Error display state.
  if (errorState) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {errorState.isRateLimit
                ? "Rate Limited"
                : errorState.type === "stream"
                ? "Connection Error"
                : "Meeting Error"}
            </CardTitle>
            <CardDescription>
              {errorState.isRateLimit
                ? "Too many requests have been made. Please try again shortly."
                : errorState.type === "stream"
                ? "Failed to initialize video service."
                : "An error occurred while setting up the meeting."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">{errorState.message}</p>
            {errorState.isRateLimit && (
              <p className="text-xs text-orange-600">
                This helps ensure stable connections for all users.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                onClick={
                  errorState.type === "stream"
                    ? handleRetryStream // Retry Stream client connection
                    : handleRetry // Retry call initialization
                }
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              <Button
                variant="outline"
                onClick={handleBackToDashboard}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading state if the call object is not yet available (should be brief after init).
  if (!call) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Setting up meeting room...</p>
          {roomId && (
            <p className="text-sm text-gray-400 mt-2">Meeting ID: {roomId}</p>
          )}
        </div>
      </div>
    );
  }

  // If all checks pass and `call` object exists, render the VideoCall UI.
  return <VideoCall call={call} onLeave={handleLeaveCall} />;
}
