import { StreamingPlatform, type ParsedLink } from './link_parser.service.js'

export interface OEmbedMetadata {
  title: string
  author_name: string
  thumbnail_url?: string
  album_name?: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'

const OEMBED_ENDPOINTS: Partial<Record<StreamingPlatform, string>> = {
  [StreamingPlatform.Spotify]: 'https://open.spotify.com/oembed',
  [StreamingPlatform.YouTube]: 'https://www.youtube.com/oembed',
  [StreamingPlatform.SoundCloud]: 'https://soundcloud.com/oembed',
}

export class PlatformMetadataService {
  private static readonly APPLE_MUSIC_SUFFIX = / on Apple Music$/i

  static stripAppleMusicSuffix(value: string): string {
    return value.replace(PlatformMetadataService.APPLE_MUSIC_SUFFIX, '').trim()
  }

  static decodeHtmlEntities(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/')
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
  }

  private static getMetaContent(html: string, property: string): string | undefined {
    const regex = new RegExp(
      `<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']|<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${property}["']`,
      'i'
    )
    const match = html.match(regex)
    const value = match ? match[1] || match[2] : undefined
    return value ? PlatformMetadataService.decodeHtmlEntities(value) : undefined
  }

  async fetch(parsedLink: ParsedLink): Promise<OEmbedMetadata | { error: string }> {
    const { platform, originalUrl } = parsedLink

    if (platform === StreamingPlatform.AppleMusic) {
      return this.fetchAppleMusicMetadata(originalUrl)
    }

    // YouTube Music playlists — oEmbed only supports video URLs, not playlists
    if (platform === StreamingPlatform.YouTube && originalUrl.includes('/playlist?')) {
      return this.fetchYouTubeMusicPlaylistMetadata(originalUrl)
    }

    const baseEndpoint = OEMBED_ENDPOINTS[platform]

    if (!baseEndpoint) {
      return { error: `oEmbed not supported for platform: ${platform}` }
    }

    const oEmbedUrl = new URL(baseEndpoint)
    oEmbedUrl.searchParams.set('url', originalUrl)
    oEmbedUrl.searchParams.set('format', 'json')

    try {
      const response = await fetch(oEmbedUrl.toString())

      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Content not found on the streaming platform' }
        }
        return { error: `Failed to fetch metadata from ${platform}` }
      }

      const data = (await response.json()) as Record<string, unknown>

      const result: OEmbedMetadata = {
        title: PlatformMetadataService.decodeHtmlEntities(String(data.title || '')),
        author_name: PlatformMetadataService.decodeHtmlEntities(String(data.author_name || '')),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }

      // Spotify oEmbed doesn't return author_name for tracks — enrich from page HTML
      if (platform === StreamingPlatform.Spotify && !result.author_name) {
        const htmlMetadata = await this.fetchSpotifyHtmlMetadata(originalUrl)
        if (htmlMetadata) {
          result.author_name = htmlMetadata.artist
          result.album_name = htmlMetadata.albumName
        }
      }

      // SoundCloud oEmbed appends " by {author}" to the title — get the clean title from HTML
      if (platform === StreamingPlatform.SoundCloud) {
        const cleanTitle = await this.fetchSoundCloudCleanTitle(originalUrl)
        if (cleanTitle) {
          result.title = cleanTitle
        }
      }

      // YouTube oEmbed returns "- Topic" suffix on auto-generated channels — enrich from page HTML
      if (platform === StreamingPlatform.YouTube && result.author_name.endsWith('- Topic')) {
        const ytMetadata = await this.fetchYouTubeHtmlMetadata(originalUrl)
        if (ytMetadata) {
          result.author_name = ytMetadata.artist
          if (ytMetadata.albumName) {
            result.album_name = ytMetadata.albumName
          }
        }
      }

      return result
    } catch {
      return { error: `Failed to connect to ${platform} oEmbed service` }
    }
  }

  async fetchAppleMusicMetadata(url: string): Promise<OEmbedMetadata | { error: string }> {
    const oEmbedResult = await this.fetchAppleMusicOEmbed(url)
    if (oEmbedResult && !('error' in oEmbedResult)) {
      return {
        title: PlatformMetadataService.stripAppleMusicSuffix(oEmbedResult.title),
        author_name: PlatformMetadataService.stripAppleMusicSuffix(oEmbedResult.author_name),
        thumbnail_url: oEmbedResult.thumbnail_url,
      }
    }

    // Fallback: scrape HTML Open Graph tags
    const htmlResult = await this.fetchAppleMusicHtml(url)
    if ('error' in htmlResult) return htmlResult

    return {
      title: PlatformMetadataService.stripAppleMusicSuffix(htmlResult.title),
      author_name: PlatformMetadataService.stripAppleMusicSuffix(htmlResult.author_name),
      thumbnail_url: htmlResult.thumbnail_url,
    }
  }

  private async fetchAppleMusicOEmbed(
    url: string
  ): Promise<OEmbedMetadata | { error: string } | null> {
    try {
      const oEmbedUrl = new URL('https://music.apple.com/api/oembed')
      oEmbedUrl.searchParams.set('url', url)

      const response = await fetch(oEmbedUrl.toString())
      if (!response.ok) return null

      const data = (await response.json()) as Record<string, unknown>

      return {
        title: PlatformMetadataService.decodeHtmlEntities(String(data.title || '')),
        author_name: PlatformMetadataService.decodeHtmlEntities(String(data.author_name || '')),
        thumbnail_url: data.thumbnail_url ? String(data.thumbnail_url) : undefined,
      }
    } catch {
      return null
    }
  }

  private async fetchAppleMusicHtml(url: string): Promise<OEmbedMetadata | { error: string }> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return { error: 'Content not found on Apple Music' }
        }
        return { error: 'Failed to fetch metadata from Apple Music' }
      }

      const html = await response.text()
      return this.parseAppleMusicOGTags(html)
    } catch {
      return { error: 'Failed to connect to Apple Music' }
    }
  }

  private async fetchSpotifyHtmlMetadata(
    url: string
  ): Promise<{ artist: string; albumName?: string } | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html' },
      })
      if (!response.ok) return null

      const html = await response.text()
      return this.parseSpotifyOgTags(html)
    } catch {
      return null
    }
  }

  private async fetchSoundCloudCleanTitle(url: string): Promise<string | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
      })
      if (!response.ok) return null

      const html = await response.text()
      return PlatformMetadataService.getMetaContent(html, 'og:title') || null
    } catch {
      return null
    }
  }

  private async fetchYouTubeMusicPlaylistMetadata(
    url: string
  ): Promise<OEmbedMetadata | { error: string }> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': GOOGLEBOT_UA, 'Accept': 'text/html' },
      })

      if (!response.ok) {
        if (response.status === 404) return { error: 'Content not found on YouTube Music' }
        return { error: 'Failed to fetch metadata from YouTube Music' }
      }

      const html = await response.text()
      return this.parseYouTubeMusicPlaylistOGTags(html)
    } catch {
      return { error: 'Failed to connect to YouTube Music' }
    }
  }

  private parseYouTubeMusicPlaylistOGTags(html: string): OEmbedMetadata | { error: string } {
    const ogTitle = PlatformMetadataService.getMetaContent(html, 'og:title')
    const ogImage = PlatformMetadataService.getMetaContent(html, 'og:image')

    if (!ogTitle) {
      return { error: 'Could not extract metadata from YouTube Music' }
    }

    // Normalize non-breaking spaces (\u00a0) to regular spaces before parsing
    const normalizedTitle = ogTitle.replace(/\u00a0/g, ' ')

    // og:title format: "{Album} - Album by/de/von/di {Artist}" (localized)
    // Split on the last " - " to separate title from the "Album {prep} {Artist}" part
    const dashIdx = normalizedTitle.lastIndexOf(' - ')
    let title = normalizedTitle
    let artist = ''

    if (dashIdx !== -1) {
      const beforeDash = normalizedTitle.substring(0, dashIdx).trim()
      const afterDash = normalizedTitle.substring(dashIdx + 3).trim()

      // Match "Album by {Artist}", "Album de {Artist}", "Álbum de {Artist}", etc.
      const artistMatch = afterDash.match(/^[ÁA]lbum \S+ (.+)$/i)
      if (artistMatch) {
        title = beforeDash
        artist = artistMatch[1].trim()
      }
    }

    return { title, author_name: artist, thumbnail_url: ogImage }
  }

  private async fetchYouTubeHtmlMetadata(
    originalUrl: string
  ): Promise<{ artist: string; albumName?: string } | null> {
    try {
      const url = new URL(originalUrl)
      url.hostname = 'www.youtube.com'

      const response = await fetch(url.toString(), {
        headers: { 'User-Agent': BROWSER_UA, 'Accept': 'text/html' },
      })
      if (!response.ok) return null

      const html = await response.text()
      return this.parseYouTubeDescription(html)
    } catch {
      return null
    }
  }

  private parseAppleMusicOGTags(html: string): OEmbedMetadata | { error: string } {
    const ogTitle = PlatformMetadataService.getMetaContent(html, 'og:title')
    const ogDescription = PlatformMetadataService.getMetaContent(html, 'og:description')
    const ogImage = PlatformMetadataService.getMetaContent(html, 'og:image')

    if (!ogTitle) {
      return { error: 'Could not extract metadata from Apple Music page' }
    }

    let title = ogTitle
    let authorName = ''

    if (ogTitle.includes(' - ')) {
      const parts = ogTitle.split(' - ')
      title = parts[0].trim()
      authorName = parts.slice(1).join(' - ').trim()
    } else if (ogTitle.includes(' by ')) {
      const byIndex = ogTitle.lastIndexOf(' by ')
      title = ogTitle.substring(0, byIndex).trim()
      authorName = ogTitle.substring(byIndex + 4).trim()
    }

    if (!authorName && ogDescription) {
      const descParts = ogDescription.split(' · ')
      if (descParts.length >= 1) {
        authorName = descParts[0].trim()
      }
    }

    return { title, author_name: authorName, thumbnail_url: ogImage }
  }

  private parseSpotifyOgTags(html: string): { artist: string; albumName?: string } | null {
    const ogDescription = PlatformMetadataService.getMetaContent(html, 'og:description')
    if (!ogDescription) return null

    // Spotify og:description format: "Artist · Album · Song · Year" (tracks)
    //                             or "Artist · album · Year · N songs" (albums)
    const parts = ogDescription.split(' \u00B7 ').map((p) => p.trim())
    if (parts.length < 2) return null

    const artist = parts[0]
    const albumName =
      parts.length >= 3 && !['album', 'single', 'ep'].includes(parts[1].toLowerCase())
        ? parts[1]
        : undefined

    return { artist, albumName }
  }

  private parseYouTubeDescription(html: string): { artist: string; albumName?: string } | null {
    const match = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.+?\});/)
    if (!match) {
      const ogDescription = PlatformMetadataService.getMetaContent(html, 'og:description')
      return ogDescription ? { artist: ogDescription.trim() } : null
    }

    try {
      const data = JSON.parse(match[1]) as { videoDetails?: { shortDescription?: string } }
      const description = data?.videoDetails?.shortDescription
      if (!description) return null

      // Auto-generated music videos have this format:
      // "Provided to YouTube by {label}\n\n{title} · {artist}\n\n{album}\n\n℗ ..."
      const lines = description.split('\n').filter((l) => l.trim())

      if (!lines[0]?.startsWith('Provided to YouTube')) {
        const ogDescription = PlatformMetadataService.getMetaContent(html, 'og:description')
        return ogDescription ? { artist: ogDescription.trim() } : null
      }

      // Line 2: "{title} · {artist1} · {artist2} · ..."
      const titleArtistLine = lines[1]
      if (!titleArtistLine?.includes(' \u00B7 ')) return null

      const artist = titleArtistLine.split(' \u00B7 ').slice(1).join(', ').trim()

      // Line 3: "{album}"
      const albumLine = lines[2]
      const albumName = albumLine && !albumLine.startsWith('\u2117') ? albumLine.trim() : undefined

      return { artist, albumName }
    } catch {
      return null
    }
  }
}
