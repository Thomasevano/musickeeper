import { test } from '@japa/runner'
import {
  buildMusicBrainzQuery,
  normalizeSearchResults,
  rankSearchResults,
} from '../../../inertia/lib/qobuz_search.js'
import { SearchType } from '../../../src/domain/music_item.js'
import type { NewListenLaterItem } from '../../../src/infrastructure/storage/listen_later_storage.js'

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

function item(itemId: string, title: string, artists: string[]): NewListenLaterItem {
  return { id: itemId, title, artists, releaseDate: '', itemType: SearchType.track }
}

test.group('MusicBrainz query compiler', () => {
  test('requires every term in the order supplied, regardless of title/artist order', ({
    assert,
  }) => {
    assert.equal(buildMusicBrainzQuery('Welcome Eminem'), '"Welcome" AND "Eminem"')
    assert.equal(buildMusicBrainzQuery('Eminem Welcome'), '"Eminem" AND "Welcome"')
    assert.equal(buildMusicBrainzQuery('one two three'), '"one" AND "two" AND "three"')
  })

  test('escapes embedded quotes and backslashes inside quoted terms', ({ assert }) => {
    assert.equal(
      buildMusicBrainzQuery('say "hello" path\\name'),
      '"say" AND "\\"hello\\"" AND "path\\\\name"'
    )
  })

  test('treats Lucene operators and punctuation as literal terms', ({ assert }) => {
    assert.equal(
      buildMusicBrainzQuery('rock OR artist:foo +bar (live)'),
      '"rock" AND "OR" AND "artist:foo" AND "+bar" AND "(live)"'
    )
  })

  test('preserves punctuation-only queries and standalone non-separator punctuation', ({
    assert,
  }) => {
    for (const punctuation of ['+', '-', '—']) {
      assert.isNotEmpty(buildMusicBrainzQuery(punctuation))
    }
    assert.equal(buildMusicBrainzQuery('rock + roll'), '"rock" AND "+" AND "roll"')
  })

  test('quotes a single term and handles surrounding and repeated whitespace', ({ assert }) => {
    assert.equal(buildMusicBrainzQuery('  Eminem  '), '"Eminem"')
    assert.equal(buildMusicBrainzQuery('  Welcome\t\n Eminem  '), '"Welcome" AND "Eminem"')
  })

  test('handles standalone separators without dropping the meaningful terms', ({ assert }) => {
    for (const separator of ['-', '—']) {
      assert.include(
        ['"Welcome" AND "Eminem"', `"Welcome" AND "${separator}" AND "Eminem"`],
        buildMusicBrainzQuery(`Welcome ${separator} Eminem`)
      )
    }
  })
})

test.group('MusicBrainz search result ranking', () => {
  test('ranks the combined title and artist match above title-only and artist-only distractors', ({
    assert,
  }) => {
    const titleOnly = item('title', 'Welcome', ['Another Artist'])
    const artistOnly = item('artist', 'Another Song', ['Eminem'])
    const unrelated = item('other', 'Another Song', ['Another Artist'])
    const match = item('match', 'Welcome', ['Eminem'])
    const results = rankSearchResults([titleOnly, unrelated, artistOnly, match], 'Welcome Eminem')

    assert.strictEqual(results[0], match)
    assert.sameMembers(results, [titleOnly, unrelated, artistOnly, match])
  })

  test('prefers an exact whole-query artist match when term coverage is tied', ({ assert }) => {
    const titleMatch = item('title', 'Eminem', ['Another Artist'])
    const artistMatch = item('artist', 'Another Song', ['Eminem'])
    assert.deepEqual(rankSearchResults([titleMatch, artistMatch], 'Eminem'), [
      artistMatch,
      titleMatch,
    ])
  })

  test('finds the combined match with artist and title in reverse query order', ({ assert }) => {
    const match = item('match', 'Welcome', ['Eminem'])
    const distractor = item('other', 'Welcome', ['Another Artist'])
    assert.strictEqual(rankSearchResults([distractor, match], 'Eminem Welcome')[0], match)
  })

  test('matches case and accents insensitively', ({ assert }) => {
    const match = item('match', 'Déjà Vu', ['Beyoncé'])
    const distractor = item('other', 'Déjà Vu', ['Another Artist'])
    assert.strictEqual(rankSearchResults([distractor, match], 'DEJA VU BEYONCE')[0], match)
  })

  test('matches an artist who is not first in a multi-artist credit', ({ assert }) => {
    const match = item('match', 'Welcome', ['Guest Artist', 'Eminem'])
    const distractor = item('other', 'Welcome', ['Guest Artist'])
    assert.strictEqual(rankSearchResults([distractor, match], 'Welcome Eminem')[0], match)
  })

  test('keeps equal-scoring results in their original order', ({ assert }) => {
    const first = item('first', 'Welcome', ['Eminem'])
    const second = item('second', 'Welcome', ['Eminem'])
    const third = item('third', 'Welcome', ['Eminem'])
    assert.deepEqual(rankSearchResults([first, second, third], 'Welcome Eminem'), [
      first,
      second,
      third,
    ])
  })

  test('does not mutate the input array or its items', ({ assert }) => {
    const distractor = item('other', 'Welcome', ['Someone Else'])
    const match = item('match', 'Welcome', ['Eminem', 'Guest'])
    const input = [distractor, match]
    const snapshot = input.map((entry) => ({ ...entry, artists: [...entry.artists] }))
    const ranked = rankSearchResults(input, 'Welcome Eminem')

    assert.notStrictEqual(ranked, input)
    assert.deepEqual(input, snapshot)
    assert.strictEqual(input[0], distractor)
    assert.strictEqual(input[1], match)
    assert.strictEqual(ranked[0], match)
  })
})
