export type spotifyTokens = {
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