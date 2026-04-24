export interface PlatformSpec {
  id: string
  label: string
  category: 'stream' | 'buy'
  hostMatcher: (host: string) => boolean
}

export const PLATFORMS: PlatformSpec[] = [
  {
    id: 'spotify',
    label: 'Spotify',
    category: 'stream',
    hostMatcher: (h: string) => h.endsWith('spotify.com'),
  },
  {
    id: 'apple-music',
    label: 'Apple Music',
    category: 'stream',
    hostMatcher: (h: string) => h === 'music.apple.com' || h === 'itunes.apple.com',
  },
  {
    id: 'youtube-music',
    label: 'YouTube Music',
    category: 'stream',
    hostMatcher: (h: string) => h === 'music.youtube.com' || h.endsWith('youtube.com'),
  },
  {
    id: 'soundcloud',
    label: 'SoundCloud',
    category: 'stream',
    hostMatcher: (h: string) => h.endsWith('soundcloud.com'),
  },
  {
    id: 'tidal',
    label: 'Tidal',
    category: 'stream',
    hostMatcher: (h: string) => h.endsWith('tidal.com'),
  },
  {
    id: 'deezer',
    label: 'Deezer',
    category: 'stream',
    hostMatcher: (h: string) => h.endsWith('deezer.com'),
  },
  {
    id: 'bandcamp',
    label: 'Bandcamp',
    category: 'buy',
    hostMatcher: (h: string) => h.endsWith('bandcamp.com'),
  },
  {
    id: 'qobuz',
    label: 'Qobuz',
    category: 'buy',
    hostMatcher: (h: string) => h.endsWith('qobuz.com'),
  },
]

export function detectPlatform(url: string): PlatformSpec | null {
  try {
    return PLATFORMS.find((p) => p.hostMatcher(new URL(url).host)) ?? null
  } catch {
    return null
  }
}

export function normalizeLinkUrl(url: string, locale: string): string {
  try {
    const parsed = new URL(url)

    if (parsed.hostname === 'itunes.apple.com') {
      parsed.hostname = 'music.apple.com'
    }

    if (parsed.hostname === 'music.apple.com') {
      const appleLocale = locale.split('-')[0].toLowerCase()
      const parts = parsed.pathname.split('/')
      if (parts.length > 1 && /^[a-z]{2}$/.test(parts[1])) {
        parts[1] = appleLocale
      }
      parsed.pathname = parts.join('/')
      return parsed.toString()
    }

    if (parsed.hostname.endsWith('qobuz.com')) {
      const parts = parsed.pathname.split('/')
      if (parts.length > 1 && /^[a-z]{2}-[a-z]{2}$/.test(parts[1])) {
        parts[1] = 'fr-fr'
      }
      parsed.pathname = parts.join('/')
      return parsed.toString()
    }

    return url
  } catch {
    return url
  }
}
