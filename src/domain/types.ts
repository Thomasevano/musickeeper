export type AuthProviderTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}
export interface ProviderTokens extends AuthProviderTokens {
  userId: string
}
