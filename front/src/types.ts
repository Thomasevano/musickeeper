export type providerAuthTokens = {
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

export type PlaylistInfos = {
  id: string,
  title: string,
  description: string,
  tracks: string,
  link: string,
  imageUrl: string,
  owner: string
}