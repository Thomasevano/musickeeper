import { User } from '../../../domain/user.js'

export function SerializeUserInfosFromSpotify(user: SpotifyApi.CurrentUsersProfileResponse): User {
  return new User({
    id: user.id,
    name: user.display_name ?? `user-${user.id}`,
    email: user.email,
    avatar: user.images && user.images[0].url,
  })
}
