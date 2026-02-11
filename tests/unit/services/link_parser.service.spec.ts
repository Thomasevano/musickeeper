import { test } from '@japa/runner'
import {
  LinkParserService,
  StreamingPlatform,
  isLinkParseError,
} from '../../../src/infrastructure/services/link_parser.service.js'
import { SearchType } from '../../../src/domain/music_item.js'

const service = new LinkParserService()

// Spotify URL tests
test.group('LinkParserService - Spotify URLs', () => {
  test('parses Spotify track URL', ({ assert }) => {
    const url = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.Spotify)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, '4uLU6hMCjMI75M1A2tKUQC')
      assert.equal(result.originalUrl, url)
    }
  })

  test('parses Spotify album URL', ({ assert }) => {
    const url = 'https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.Spotify)
      assert.equal(result.type, SearchType.album)
      assert.equal(result.id, '1DFixLWuPkv3KT3TnV35m3')
      assert.equal(result.originalUrl, url)
    }
  })

  test('parses Spotify URL with query parameters', ({ assert }) => {
    const url = 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc123'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.Spotify)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, '4uLU6hMCjMI75M1A2tKUQC')
    }
  })
})

// YouTube URL tests
test.group('LinkParserService - YouTube URLs', () => {
  test('parses standard YouTube URL', ({ assert }) => {
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.YouTube)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, 'dQw4w9WgXcQ')
      assert.equal(result.originalUrl, url)
    }
  })

  test('parses short YouTube URL (youtu.be)', ({ assert }) => {
    const url = 'https://youtu.be/dQw4w9WgXcQ'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.YouTube)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, 'dQw4w9WgXcQ')
    }
  })

  test('parses YouTube Music URL', ({ assert }) => {
    const url = 'https://music.youtube.com/watch?v=dQw4w9WgXcQ'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.YouTube)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, 'dQw4w9WgXcQ')
    }
  })

  test('parses YouTube URL without www', ({ assert }) => {
    const url = 'https://youtube.com/watch?v=dQw4w9WgXcQ'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.YouTube)
      assert.equal(result.id, 'dQw4w9WgXcQ')
    }
  })
})

// Apple Music URL tests
test.group('LinkParserService - Apple Music URLs', () => {
  test('parses Apple Music album URL', ({ assert }) => {
    const url = 'https://music.apple.com/us/album/midnights/1649434004'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.AppleMusic)
      assert.equal(result.type, SearchType.album)
      assert.equal(result.id, '1649434004')
      assert.equal(result.originalUrl, url)
    }
  })

  test('parses Apple Music track URL with ?i= parameter', ({ assert }) => {
    const url = 'https://music.apple.com/us/album/anti-hero/1649434004?i=1649434288'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.AppleMusic)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, '1649434288')
    }
  })

  test('parses Apple Music song URL', ({ assert }) => {
    const url = 'https://music.apple.com/us/song/anti-hero/1649434288'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.AppleMusic)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, '1649434288')
    }
  })

  test('parses Apple Music URL with different region', ({ assert }) => {
    const url = 'https://music.apple.com/gb/album/midnights/1649434004'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.AppleMusic)
      assert.equal(result.type, SearchType.album)
      assert.equal(result.id, '1649434004')
    }
  })
})

// SoundCloud URL tests
test.group('LinkParserService - SoundCloud URLs', () => {
  test('parses SoundCloud track URL', ({ assert }) => {
    const url = 'https://soundcloud.com/artistname/track-title'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.SoundCloud)
      assert.equal(result.type, SearchType.track)
      assert.equal(result.id, 'artistname/track-title')
      assert.equal(result.originalUrl, url)
    }
  })

  test('parses SoundCloud URL with query parameters', ({ assert }) => {
    const url = 'https://soundcloud.com/artistname/track-title?utm_source=clipboard'
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.SoundCloud)
      assert.equal(result.id, 'artistname/track-title')
    }
  })
})

// Error cases
test.group('LinkParserService - Error cases', () => {
  test('returns error for invalid URL format', ({ assert }) => {
    const result = service.parseLink('not-a-valid-url')

    assert.isTrue(isLinkParseError(result))
    if (isLinkParseError(result)) {
      assert.equal(result.error, 'Invalid URL format')
      assert.equal(result.originalUrl, 'not-a-valid-url')
    }
  })

  test('returns error for unsupported platform', ({ assert }) => {
    const url = 'https://tidal.com/browse/track/12345678'
    const result = service.parseLink(url)

    assert.isTrue(isLinkParseError(result))
    if (isLinkParseError(result)) {
      assert.include(result.error, 'Unsupported platform')
      assert.equal(result.originalUrl, url)
    }
  })

  test('trims whitespace from URL', ({ assert }) => {
    const url = '  https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC  '
    const result = service.parseLink(url)

    assert.isFalse(isLinkParseError(result))
    if (!isLinkParseError(result)) {
      assert.equal(result.platform, StreamingPlatform.Spotify)
      assert.equal(result.id, '4uLU6hMCjMI75M1A2tKUQC')
    }
  })

  test('returns error for empty string', ({ assert }) => {
    const result = service.parseLink('')

    assert.isTrue(isLinkParseError(result))
  })
})
