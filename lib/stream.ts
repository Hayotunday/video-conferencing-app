import { StreamVideoClient, type User } from "@stream-io/video-react-sdk"

export const createStreamClient = (user: User, token: string, apiKey: string) => {
  return new StreamVideoClient({
    apiKey,
    user,
    token,
  })
}
