import { test } from '@japa/runner'
import { normalizeSearchResults } from '../../../inertia/lib/qobuz_search.js'

const id = '12345678-1234-4234-8234-123456789abc'
const album = {
  id,
  title: ' Album ',
  artists: ['Artist'],
  releaseDate: '2020-01-01',
  itemType: 'album',
  coverArt: 'https://coverartarchive.org/release-group/abc/front-250',
}

test.group('MusicBrainz search normalization', () => {
  test('normalizes an album and constructs its MusicBrainz release URL', ({ assert }) => {
    assert.deepEqual(normalizeSearchResults({ serializedItems: [album] }, 'album'), [
      {
        id,
        title: 'Album',
        artists: ['Artist'],
        releaseDate: '2020-01-01',
        itemType: 'album',
        sourceUrl: `https://musicbrainz.org/release/${id}`,
        coverArt: 'https://coverartarchive.org/release-group/abc/front-250',
      },
    ])
  })

  test('preserves track metadata and constructs a recording URL', ({ assert }) => {
    assert.deepEqual(
      normalizeSearchResults(
        {
          serializedItems: [
            {
              id,
              title: 'Track',
              artists: ['One', 'Two'],
              itemType: 'track',
              releaseDate: '1999',
              length: 12345,
              albumName: 'The album',
            },
          ],
        },
        'track'
      ),
      [
        {
          id,
          title: 'Track',
          artists: ['One', 'Two'],
          itemType: 'track',
          releaseDate: '1999',
          length: 12345,
          albumName: 'The album',
          sourceUrl: `https://musicbrainz.org/recording/${id}`,
        },
      ]
    )
  })

  test('rejects malformed envelopes, IDs, titles and mismatched categories', ({ assert }) => {
    for (const payload of [null, [], 'bad', {}, { serializedItems: {} }]) {
      assert.deepEqual(normalizeSearchResults(payload, 'album'), [])
    }
    const invalid = [
      null,
      'bad',
      { ...album, id: 'not-a-uuid' },
      { ...album, id: `https://musicbrainz.org/release/${id}` },
      { ...album, title: '  ' },
      { ...album, itemType: 'track' },
    ]
    assert.deepEqual(normalizeSearchResults({ serializedItems: invalid }, 'album'), [])
  })

  test('ignores unsafe cover URLs and malformed optional metadata', ({ assert }) => {
    for (const coverArt of [
      'javascript:alert(1)',
      '//example.com/a',
      'http://example.com/a',
      'https://user:pass@example.com/a',
      'not a url',
    ]) {
      const [result] = normalizeSearchResults(
        {
          serializedItems: [
            {
              ...album,
              coverArt,
              artists: ['Artist', null, 42],
              releaseDate: null,
              length: -1,
              albumName: 5,
            },
          ],
        },
        'album'
      )
      assert.notProperty(result, 'coverArt')
      assert.notProperty(result, 'length')
      assert.notProperty(result, 'albumName')
      assert.deepEqual(result.artists, ['Artist'])
      assert.equal(result.releaseDate, '')
    }
  })

  test('deduplicates repeated raw IDs', ({ assert }) => {
    const results = normalizeSearchResults({ serializedItems: [album, album] }, 'album')
    assert.lengthOf(results, 1)
    assert.equal(results[0].id, id)
  })

  test('caps valid results at ten after filtering invalid entries', ({ assert }) => {
    const items = [
      { ...album, id: 'bad' },
      ...Array.from({ length: 12 }, (_, index) => ({
        ...album,
        id: `12345678-1234-4234-8234-${String(index).padStart(12, '0')}`,
      })),
    ]
    const results = normalizeSearchResults({ serializedItems: items }, 'album')
    assert.lengthOf(results, 10)
    assert.equal(results[0].id, '12345678-1234-4234-8234-000000000000')
    assert.equal(results[9].id, '12345678-1234-4234-8234-000000000009')
  })
})
