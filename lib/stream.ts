import { StreamVideoClient, type User } from "@stream-io/video-react-sdk"

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!

export const createStreamClient = (user: User, token: string) => {
  return new StreamVideoClient({
    apiKey,
    user,
    token,
  })
}
