import { User } from '../../../domain/user.js'
import { UserRepository } from '../../../application/repositories/user.respository.js'
import { SerializeUserInfosFromSpotify } from '../../serializers/spotify/user.serializer.js'

export class SpotifyUserRepository implements UserRepository {
  async getCurrentUser(bearerToken: string): Promise<User> {
    const user = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`,
      },
    }).then((response) => response.json() as Promise<SpotifyApi.CurrentUsersProfileResponse>)

    const serializedUser: User = SerializeUserInfosFromSpotify(user)

    return serializedUser
  }
}
