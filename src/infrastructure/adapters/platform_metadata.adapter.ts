import type { ParsedLink } from '#domain/link.js'
import { StreamingPlatform } from '#domain/link.js'
import type { PlatformMetadata } from '#application/ports/platform_metadata.port.js'
import { PlatformMetadataPort } from '#application/ports/platform_metadata.port.js'
import { fetchAppleMusicMetadata } from './platform_metadata/apple_music.js'
import { fetchSoundCloudMetadata } from './platform_metadata/soundcloud.js'
import { fetchSpotifyMetadata } from './platform_metadata/spotify.js'
import type { FetchResult } from './platform_metadata/types.js'
import { fetchYouTubeMetadata } from './platform_metadata/youtube.js'

type MetadataFetcher = (parsedLink: ParsedLink) => Promise<FetchResult>

const platformFetchers: Record<StreamingPlatform, MetadataFetcher> = {
  [StreamingPlatform.AppleMusic]: fetchAppleMusicMetadata,
  [StreamingPlatform.SoundCloud]: fetchSoundCloudMetadata,
  [StreamingPlatform.Spotify]: fetchSpotifyMetadata,
  [StreamingPlatform.YouTube]: fetchYouTubeMetadata,
}

export class PlatformMetadataAdapter extends PlatformMetadataPort {
  async fetch(parsedLink: ParsedLink): Promise<PlatformMetadata | { error: string }> {
    const result = await platformFetchers[parsedLink.platform](parsedLink)
    if ('error' in result) return result

    return {
      title: result.title,
      artist: result.author_name,
      thumbnailUrl: result.thumbnail_url,
      albumName: result.album_name,
    }
  }
}
