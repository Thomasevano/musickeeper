export function matchesArtist(artistName: string, artists: string[]): boolean {
  const lower = artistName.toLowerCase()
  return artists.some((a) => lower.includes(a.toLowerCase()))
}

export interface PlatformSearchResult {
  platform: string
  label: string
  url: string
  category: 'stream' | 'buy'
  confidence: 'high' | 'medium'
}
