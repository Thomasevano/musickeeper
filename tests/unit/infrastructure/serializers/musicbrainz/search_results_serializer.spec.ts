import { test } from '@japa/runner'
import { serializeMusicBrainzSearchResults } from '#infrastructure/serializers/musicbrainz/search_results_serializer.js'
import { SearchType } from '#domain/music_item.js'

const artistCredit = [
  {
    name: 'Test Artist',
    joinphrase: '',
    artist: {
      'id': 'artist-1',
      'name': 'Test Artist',
      'sort-name': 'Artist, Test',
      'type-id': '',
      'disambiguation': '',
      'type': '',
    },
  },
]

function release(
  id: string,
  primaryType: string,
  title = `Release ${id}`,
  secondaryTypes: string[] = []
) {
  return {
    id,
    title,
    'date': '2020-01-01',
    'artist-credit': artistCredit,
    'release-group': {
      'id': `${id}-group`,
      'primary-type': primaryType,
      'secondary-types': secondaryTypes,
    },
  }
}

function recordingList(releases: unknown[]) {
  return {
    recordings: [
      {
        'id': 'recording-1',
        'title': 'Test Recording',
        'length': 200000,
        'first-release-date': '2020-01-01',
        'artist-credit': artistCredit,
        releases,
      },
    ],
  }
}

test.group('serializeMusicBrainzSearchResults', () => {
  test('builds one release-group cover URL without calling the archive', async ({ assert }) => {
    // Any HTTP on this path is the regression we are guarding against: cover art
    // lookups used to run per result and gate the whole search response.
    const realFetch = globalThis.fetch
    globalThis.fetch = (() => {
      throw new Error('search serialization must not perform network calls')
    }) as typeof globalThis.fetch

    try {
      const items = await serializeMusicBrainzSearchResults(
        recordingList([release('release-abc', 'Album')]) as never
      )

      assert.lengthOf(items, 1)
      assert.equal(
        items[0].coverArt,
        'https://coverartarchive.org/release-group/release-abc-group/front-250'
      )
      assert.equal(items[0].itemType, SearchType.track)
    } finally {
      globalThis.fetch = realFetch
    }
  })

  test('prefers an album release over a single when choosing cover art', async ({ assert }) => {
    const items = await serializeMusicBrainzSearchResults(
      recordingList([release('single-id', 'Single'), release('album-id', 'Album')]) as never
    )

    assert.equal(
      items[0].coverArt,
      'https://coverartarchive.org/release-group/album-id-group/front-250'
    )
  })

  test('prefers a regular album over a compilation', async ({ assert }) => {
    const items = await serializeMusicBrainzSearchResults(
      recordingList([
        release('compilation-id', 'Album', 'Compilation', ['Compilation']),
        release('album-id', 'Album'),
      ]) as never
    )

    assert.equal(
      items[0].coverArt,
      'https://coverartarchive.org/release-group/album-id-group/front-250'
    )
  })

  test('leaves cover art unset when a recording has no release to address', async ({ assert }) => {
    const items = await serializeMusicBrainzSearchResults(recordingList([]) as never)

    assert.isUndefined(items[0].coverArt)
  })

  test('builds cover art urls for album search results', async ({ assert }) => {
    const items = await serializeMusicBrainzSearchResults({
      releases: [release('album-release-1', 'Album', 'An Album')],
    } as never)

    assert.lengthOf(items, 1)
    assert.equal(
      items[0].coverArt,
      'https://coverartarchive.org/release-group/album-release-1-group/front-250'
    )
    assert.equal(items[0].itemType, SearchType.album)
  })
})
