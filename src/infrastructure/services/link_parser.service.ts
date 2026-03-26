import { SearchType } from '../../domain/music_item.js'

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

export class LinkParserService {
  private readonly spotifyPattern = /^https?:\/\/open\.spotify\.com\/(track|album)\/([a-zA-Z0-9]+)/
  private readonly youtubePattern =
    /^https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/
  private readonly appleMusicPattern =
    /^https?:\/\/music\.apple\.com\/([a-z]{2})\/(album|song)\/[^/]+\/([0-9]+)(?:\?i=([0-9]+))?/
  private readonly soundcloudTrackPattern =
    /^https?:\/\/soundcloud\.com\/([^/]+)\/(?!sets\/)([^/?]+)/
  private readonly soundcloudSetPattern = /^https?:\/\/soundcloud\.com\/([^/]+)\/sets\/([^/?]+)/

  parseLink(url: string): LinkParseResult {
    const trimmedUrl = url.trim()

    if (!this.isValidUrl(trimmedUrl)) {
      return { error: 'Invalid URL format', originalUrl: trimmedUrl }
    }

    const spotifyResult = this.parseSpotifyUrl(trimmedUrl)
    if (spotifyResult) return spotifyResult

    const youtubeResult = this.parseYouTubeUrl(trimmedUrl)
    if (youtubeResult) return youtubeResult

    const appleMusicResult = this.parseAppleMusicUrl(trimmedUrl)
    if (appleMusicResult) return appleMusicResult

    const soundcloudResult = this.parseSoundCloudUrl(trimmedUrl)
    if (soundcloudResult) return soundcloudResult

    return {
      error: 'Unsupported platform. Supported: Spotify, YouTube, Apple Music, SoundCloud',
      originalUrl: trimmedUrl,
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }

  private parseSpotifyUrl(url: string): ParsedLink | null {
    const match = url.match(this.spotifyPattern)
    if (!match) return null

    const [, resourceType, id] = match
    return {
      platform: StreamingPlatform.Spotify,
      type: resourceType === 'album' ? SearchType.album : SearchType.track,
      id,
      originalUrl: url,
    }
  }

  private parseYouTubeUrl(url: string): ParsedLink | null {
    const match = url.match(this.youtubePattern)
    if (!match) return null

    const [, id] = match
    return {
      platform: StreamingPlatform.YouTube,
      type: SearchType.track,
      id,
      originalUrl: url,
    }
  }

  private parseAppleMusicUrl(url: string): ParsedLink | null {
    const match = url.match(this.appleMusicPattern)
    if (!match) return null

    const [, , resourceType, albumId, trackId] = match

    if (resourceType === 'song' || trackId) {
      return {
        platform: StreamingPlatform.AppleMusic,
        type: SearchType.track,
        id: trackId || albumId,
        originalUrl: url,
      }
    }

    return {
      platform: StreamingPlatform.AppleMusic,
      type: SearchType.album,
      id: albumId,
      originalUrl: url,
    }
  }

  private parseSoundCloudUrl(url: string): ParsedLink | null {
    const setMatch = url.match(this.soundcloudSetPattern)
    if (setMatch) {
      const [, artist, setSlug] = setMatch
      return {
        platform: StreamingPlatform.SoundCloud,
        type: SearchType.album,
        id: `${artist}/sets/${setSlug}`,
        originalUrl: url,
      }
    }

    const trackMatch = url.match(this.soundcloudTrackPattern)
    if (!trackMatch) return null

    const [, artist, trackSlug] = trackMatch
    return {
      platform: StreamingPlatform.SoundCloud,
      type: SearchType.track,
      id: `${artist}/${trackSlug}`,
      originalUrl: url,
    }
  }
}
