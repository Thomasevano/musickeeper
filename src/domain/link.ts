import { type SearchType, type MusicItem } from './music_item.js'

export enum StreamingPlatform {
  Spotify = 'spotify',
  YouTube = 'youtube',
  AppleMusic = 'apple_music',
  SoundCloud = 'soundcloud',
}

export interface ParsedLink {
  platform: StreamingPlatform
  type: SearchType
  id: string
  originalUrl: string
}

export interface LinkParseError {
  error: string
  originalUrl: string
}

export type LinkParseResult = ParsedLink | LinkParseError

export function isLinkParseError(result: LinkParseResult): result is LinkParseError {
  return 'error' in result
}

export interface LinkMetadata {
  title: string
  artist: string
  type: SearchType
  platform: StreamingPlatform
  thumbnailUrl?: string
  originalUrl: string
  albumName?: string
}

export interface LinkMetadataSuccess {
  musicItem: MusicItem
  source: 'link'
  linkMetadata: LinkMetadata
}
