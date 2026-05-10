import { test } from '@japa/runner'
import { extractLinksFromRelations } from '../../../src/infrastructure/services/musicbrainz_external_links.service.js'

test.group('musicbrainz_external_links — extractLinksFromRelations', () => {
  test('keeps relations matching streaming/buy types', ({ assert }) => {
    const relations = [
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
      { type: 'free streaming', url: { resource: 'https://music.youtube.com/watch?v=xyz' } },
      { type: 'purchase for download', url: { resource: 'https://artist.bandcamp.com/track/foo' } },
      { type: 'download for free', url: { resource: 'https://www.qobuz.com/fr-fr/album/bar' } },
      { type: 'get the music', url: { resource: 'https://music.apple.com/us/album/baz' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links.length, 5)
    const ids = links.map((l) => l.platform).sort()
    assert.deepEqual(ids, ['apple-music', 'bandcamp', 'qobuz', 'spotify', 'youtube-music'])
  })

  test('filters out unrecognized relation types', ({ assert }) => {
    const relations = [
      { type: 'wikipedia', url: { resource: 'https://en.wikipedia.org/foo' } },
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links.length, 1)
    assert.equal(links[0].platform, 'spotify')
  })

  test('skips relations with missing url', ({ assert }) => {
    const relations = [
      { type: 'streaming' },
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links.length, 1)
  })

  test('skips relations whose host is unknown platform', ({ assert }) => {
    const relations = [
      { type: 'streaming', url: { resource: 'https://example.com/foo' } },
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links.length, 1)
    assert.equal(links[0].platform, 'spotify')
  })

  test('deduplicates by platform via seen Set', ({ assert }) => {
    const relations = [
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/first' } },
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/second' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links.length, 1)
    assert.equal(links[0].url, 'https://open.spotify.com/track/first')
  })

  test('respects pre-populated seen Set across calls', ({ assert }) => {
    const seen = new Set<string>(['spotify'])
    const relations = [
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
      { type: 'streaming', url: { resource: 'https://music.youtube.com/watch?v=xyz' } },
    ]
    const links = extractLinksFromRelations(relations, seen)
    assert.equal(links.length, 1)
    assert.equal(links[0].platform, 'youtube-music')
  })

  test('sets source to "musicbrainz" on every returned link', ({ assert }) => {
    const relations = [
      { type: 'streaming', url: { resource: 'https://open.spotify.com/track/abc' } },
    ]
    const links = extractLinksFromRelations(relations, new Set())
    assert.equal(links[0].source, 'musicbrainz')
  })

  test('returns empty array for empty input', ({ assert }) => {
    const links = extractLinksFromRelations([], new Set())
    assert.deepEqual(links, [])
  })
})
