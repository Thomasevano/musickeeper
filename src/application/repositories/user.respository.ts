import { User } from '../../domain/user.js'

export abstract class UserRepository {
  abstract getCurrentUser(bearerToken: string): Promise<User>
}
