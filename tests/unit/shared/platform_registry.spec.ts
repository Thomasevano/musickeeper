import { test } from '@japa/runner'
import {
  detectPlatform,
  normalizeLinkUrl,
  PLATFORMS,
} from '../../../src/shared/platform_registry.js'

test.group('platform_registry — detectPlatform', () => {
  test('matches spotify host', ({ assert }) => {
    assert.equal(detectPlatform('https://open.spotify.com/track/123')?.id, 'spotify')
  })

  test('matches apple-music for music.apple.com', ({ assert }) => {
    assert.equal(detectPlatform('https://music.apple.com/us/album/123')?.id, 'apple-music')
  })

  test('matches apple-music for itunes.apple.com', ({ assert }) => {
    assert.equal(detectPlatform('https://itunes.apple.com/us/album/123')?.id, 'apple-music')
  })

  test('matches youtube-music for music.youtube.com', ({ assert }) => {
    assert.equal(detectPlatform('https://music.youtube.com/watch?v=abc')?.id, 'youtube-music')
  })

  test('matches youtube-music for youtube.com', ({ assert }) => {
    assert.equal(detectPlatform('https://www.youtube.com/watch?v=abc')?.id, 'youtube-music')
  })

  test('matches soundcloud for soundcloud.com', ({ assert }) => {
    assert.equal(detectPlatform('https://soundcloud.com/foo/bar')?.id, 'soundcloud')
  })

  test('matches tidal for tidal.com', ({ assert }) => {
    assert.equal(detectPlatform('https://tidal.com')?.id, 'tidal')
  })

  test('matches deezer for deezer.com', ({ assert }) => {
    assert.equal(detectPlatform('https://deezer.com')?.id, 'deezer')
  })

  test('matches bandcamp subdomain', ({ assert }) => {
    assert.equal(detectPlatform('https://artist.bandcamp.com/album/foo')?.id, 'bandcamp')
  })

  test('returns null for unknown host', ({ assert }) => {
    assert.isNull(detectPlatform('https://example.com/foo'))
  })

  test('returns null for invalid URL', ({ assert }) => {
    assert.isNull(detectPlatform('not-a-url'))
  })

  test('all PLATFORMS have unique ids', ({ assert }) => {
    const ids = PLATFORMS.map((p) => p.id)
    assert.equal(new Set(ids).size, ids.length)
  })
})

test.group('platform_registry — normalizeLinkUrl', () => {
  test('rewrites itunes.apple.com → music.apple.com', ({ assert }) => {
    const result = normalizeLinkUrl('https://itunes.apple.com/us/album/123', 'en-US')
    assert.match(result, /^https:\/\/music\.apple\.com\//)
  })

  test('replaces apple locale segment with user locale', ({ assert }) => {
    const result = normalizeLinkUrl('https://music.apple.com/us/album/foo/123', 'fr-FR')
    assert.equal(result, 'https://music.apple.com/fr/album/foo/123')
  })

  test('preserves apple URL when no locale segment present', ({ assert }) => {
    const result = normalizeLinkUrl('https://music.apple.com/album/foo/123', 'fr-FR')
    assert.equal(result, 'https://music.apple.com/album/foo/123')
  })

  test('qobuz locale forced to fr-fr regardless of user locale', ({ assert }) => {
    // Intentional: qobuz only reliable on fr-fr; other locales break navigation.
    const result = normalizeLinkUrl('https://www.qobuz.com/en-us/album/foo/123', 'en-US')
    assert.equal(result, 'https://www.qobuz.com/fr-fr/album/foo/123')
  })

  test('qobuz path without xx-xx segment left unchanged', ({ assert }) => {
    const result = normalizeLinkUrl('https://www.qobuz.com/album/foo/123', 'en-US')
    assert.equal(result, 'https://www.qobuz.com/album/foo/123')
  })

  test('returns input unchanged for supported host', ({ assert }) => {
    const result = normalizeLinkUrl('https://open.spotify.com/track/123', 'fr-FR')
    assert.equal(result, 'https://open.spotify.com/track/123')
  })

  test('returns input unchanged for invalid URL', ({ assert }) => {
    const result = normalizeLinkUrl('not-a-url', 'fr-FR')
    assert.equal(result, 'not-a-url')
  })

  test('idempotent when locale already correct (apple)', ({ assert }) => {
    const url = 'https://music.apple.com/fr/album/foo/123'
    assert.equal(normalizeLinkUrl(url, 'fr-FR'), url)
  })
})
