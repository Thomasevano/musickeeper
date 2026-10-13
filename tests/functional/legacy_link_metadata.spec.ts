import { test } from '@japa/runner'
import { mock } from 'node:test'
import { musicbrainzApi } from '#infrastructure/adapters/musicbrainz/musicbrainz_client.js'

const endpoint = '/api/link/metadata'
const spotifyUrl = 'https://open.spotify.com/track/69kOkLUCkxIZYexIgSG8rq'
const youtubeUrl = 'https://www.youtube.com/watch?v=video123'
const thumbnailUrl = 'https://i.scdn.co/image/platform-cover'
const mbid = '026fa041-3917-4c73-9079-ed16e36f20f8'
const recording = {
  'id': mbid,
  'title': 'Catalog Track',
  'first-release-date': '2016-08-26',
  'length': 178000,
  'artist-credit': [{ artist: { name: 'Catalog Artist' } }],
  'releases': [{ 'title': 'Compilation', 'release-group': { id: 'compilation' } }],
}

function fakePlatformFetch(respond: (url: URL) => Response) {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (input) => {
    return respond(new URL(input instanceof Request ? input.url : input.toString()))
  }
  return () => {
    globalThis.fetch = originalFetch
  }
}

function spotifyMetadata(url: URL, title: string, thumbnail?: string) {
  if (url.pathname === '/oembed') {
    return Response.json({ title, thumbnail_url: thumbnail })
  }
  if (url.href === spotifyUrl) {
    return new Response(
      '<meta property="og:description" content="Artist · Platform Album · Song · 2016">'
    )
  }
  if (url.pathname.startsWith('/embed/track/')) return new Response(null, { status: 404 })
  throw new Error(`Unexpected Spotify request: ${url}`)
}

test.group('Legacy link metadata', () => {
  test('returns the first automatic MusicBrainz match with the pasted album and artwork', async ({
    client,
    cleanup,
  }) => {
    const search = mock.method(musicbrainzApi, 'search', async () => ({
      recordings: [recording, { ...recording, id: 'next', title: 'Platform Track' }],
    }))
    cleanup(() => search.mock.restore())
    cleanup(
      fakePlatformFetch((url) => spotifyMetadata(url, 'Platform Track (feat. Guest)', thumbnailUrl))
    )

    const response = await client.post(endpoint).json({ url: spotifyUrl })

    response.assertStatus(200)
    response.assertBody({
      musicItem: {
        id: mbid,
        title: 'Catalog Track',
        artists: ['Catalog Artist'],
        releaseDate: '2016-08-26',
        length: 178000,
        itemType: 'track',
        albumName: 'Platform Album',
        coverArt: thumbnailUrl,
      },
      source: 'musicbrainz',
      linkMetadata: {
        title: 'Platform Track (feat. Guest)',
        artist: 'Artist',
        type: 'track',
        originalUrl: spotifyUrl,
        albumName: 'Platform Album',
        thumbnailUrl,
      },
    })
  })

  test('uses the same-year album artwork when the pasted track has no thumbnail', async ({
    client,
    cleanup,
  }) => {
    const album = {
      'id': 'release-id',
      'title': 'Platform Album',
      'date': '2019',
      'artist-credit': [{ artist: { name: 'Artist' } }],
      'release-group': { id: 'other-year-album' },
    }
    const search = mock.method(musicbrainzApi, 'search', async (entity: string) => {
      if (entity === 'recording') return { recordings: [recording] }
      if (entity === 'release') {
        return {
          releases: [
            album,
            { ...album, 'date': '2016', 'release-group': { id: 'same-year-album' } },
          ],
        }
      }
      throw new Error(`Unexpected MusicBrainz search: ${entity}`)
    })
    cleanup(() => search.mock.restore())
    cleanup(fakePlatformFetch((url) => spotifyMetadata(url, 'Track Without Artwork')))

    const response = await client.post(endpoint).json({ url: spotifyUrl })

    response.assertStatus(200)
    response.assertBodyContains({
      source: 'musicbrainz',
      musicItem: {
        id: mbid,
        albumName: 'Platform Album',
        coverArt: 'https://coverartarchive.org/release-group/same-year-album/front-250',
      },
    })
  })

  for (const outcome of ['no results', 'a MusicBrainz error']) {
    test(`returns old-tab link metadata after ${outcome}`, async ({ client, assert, cleanup }) => {
      const title = `Pasted Track with ${outcome}`
      const artist = 'Artist One, Artist Two'
      const search = mock.method(musicbrainzApi, 'search', async () => {
        if (outcome === 'a MusicBrainz error') throw new Error('MusicBrainz unavailable')
        return { recordings: [] }
      })
      cleanup(() => search.mock.restore())
      cleanup(
        fakePlatformFetch((url) => {
          if (url.origin === 'https://www.youtube.com' && url.pathname === '/oembed') {
            return Response.json({ title, author_name: artist })
          }
          throw new Error(`Unexpected upstream request: ${url}`)
        })
      )

      const response = await client.post(endpoint).json({ url: youtubeUrl })

      response.assertStatus(200)
      assert.equal(search.mock.callCount(), 1)
      const { musicItem } = response.body()
      assert.match(musicItem.id, /^link-\d+$/)
      response.assertBody({
        musicItem: {
          id: musicItem.id,
          title,
          artists: ['Artist One', 'Artist Two'],
          releaseDate: '',
          itemType: 'track',
        },
        source: 'link',
        linkMetadata: { title, artist, type: 'track', originalUrl: youtubeUrl },
      })
    })
  }

  test('keeps legacy 400 errors for missing, invalid, and unavailable links', async ({
    client,
    cleanup,
  }) => {
    cleanup(
      fakePlatformFetch((url) => {
        if (url.origin === 'https://www.youtube.com' && url.pathname === '/oembed') {
          return new Response(null, { status: 404 })
        }
        throw new Error(`Unexpected upstream request: ${url}`)
      })
    )

    const missing = await client.post(endpoint).json({})
    missing.assertStatus(400)
    missing.assertBody({ error: 'URL is required' })

    const invalid = await client.post(endpoint).json({ url: 'not a URL' })
    invalid.assertStatus(400)
    invalid.assertBody({ error: 'Invalid URL format', originalUrl: 'not a URL' })

    const unavailable = await client.post(endpoint).json({ url: youtubeUrl })
    unavailable.assertStatus(400)
    unavailable.assertBody({
      error: 'Content not found on the streaming platform',
      originalUrl: youtubeUrl,
    })
  })
})
