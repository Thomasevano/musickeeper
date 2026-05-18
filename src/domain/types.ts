export type authProviderTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}
export interface providerTokens extends authProviderTokens {
  userId: string
}
