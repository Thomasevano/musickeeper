import { User } from '../../../domain/user.js'
import { UserRepository } from '../../../application/repositories/user.respository.js'
import { SerializeUserInfosFromSpotify } from '../../serializers/spotify/user.serializer.js'

export class SpotifyUserRepository implements UserRepository {
  async getCurrentUser(bearerToken: string): Promise<User> {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
    })

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('SPOTIFY_USER_NOT_ALLOWED')
      }
      throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
    }

    const user = await response.json() as SpotifyApi.CurrentUsersProfileResponse
    const serializedUser: User = SerializeUserInfosFromSpotify(user)

    return serializedUser
  }
}
