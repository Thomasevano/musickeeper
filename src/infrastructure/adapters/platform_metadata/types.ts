export interface OEmbedMetadata {
  title: string
  author_name: string
  thumbnail_url?: string
  album_name?: string
}

export interface ArtistAlbumMetadata {
  artist: string
  albumName?: string
}

export type FetchResult = OEmbedMetadata | { error: string }

export const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export const GOOGLEBOT_UA =
  'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
