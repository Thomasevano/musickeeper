export type authProviderTokens = {
  accessToken: string
  refreshToken: string
  expiresAt: string
}

export type PaginatedPlaylistsInfos = {
  limit: number
  offset: number
  previousUrl: string
  nextUrl: string
  total: number
  playlistsInfos: PlaylistInfos[]
}

export interface providerTokens extends authProviderTokens {
  userId: string
}
