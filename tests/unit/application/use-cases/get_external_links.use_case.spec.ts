import { test } from '@japa/runner'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { type ExternalLink, SearchType } from '#domain/music_item.js'

class StubMusicBrainzLinksPort extends MusicBrainzExternalLinksPort {
  calls = 0

  constructor(private links: ExternalLink[]) {
    super()
  }

  async fetchExternalLinks(): Promise<ExternalLink[]> {
    this.calls += 1
    return this.links
  }
}

class StubPlatformSearchPort extends PlatformSearchPort {
  constructor(private links: ExternalLink[]) {
    super()
  }

  async search(): Promise<ExternalLink[]> {
    return this.links
  }
}

function makeUseCase(musicBrainzLinks: ExternalLink[], platformLinks: ExternalLink[]) {
  const musicBrainz = new StubMusicBrainzLinksPort(musicBrainzLinks)
  const platformSearch = new StubPlatformSearchPort(platformLinks)
  return {
    musicBrainz,
    useCase: new GetExternalLinksUseCase(musicBrainz, platformSearch),
  }
}

test.group('GetExternalLinksUseCase', () => {
  test('deduplicates the same destination and normalizes locale-sensitive URLs', async ({
    assert,
  }) => {
    const { useCase } = makeUseCase(
      [
        {
          platform: 'spotify',
          label: 'Spotify',
          url: 'https://open.spotify.com/album/from-musicbrainz',
          category: 'stream',
          source: 'musicbrainz',
        },
        {
          platform: 'apple-music',
          label: 'Apple Music',
          url: 'https://music.apple.com/us/album/example/1',
          category: 'stream',
          source: 'musicbrainz',
        },
      ],
      [
        {
          platform: 'spotify',
          label: 'Spotify',
          url: 'https://open.spotify.com/album/from-musicbrainz',
          category: 'stream',
          source: 'platform-search',
        },
        {
          platform: 'qobuz',
          label: 'Qobuz',
          url: 'https://www.qobuz.com/de-de/album/example/1',
          category: 'buy',
          source: 'platform-search',
        },
      ]
    )

    const result = await useCase.execute(
      'release-id',
      SearchType.album,
      ['Artist'],
      'Album',
      'fr-CA'
    )

    assert.deepEqual(
      result.map(({ platform, url, source }) => ({ platform, url, source })),
      [
        {
          platform: 'spotify',
          url: 'https://open.spotify.com/album/from-musicbrainz',
          source: 'musicbrainz',
        },
        {
          platform: 'apple-music',
          url: 'https://music.apple.com/fr/album/example/1',
          source: 'musicbrainz',
        },
        {
          platform: 'qobuz',
          url: 'https://www.qobuz.com/fr-fr/album/example/1',
          source: 'platform-search',
        },
      ]
    )
  })

  test('skips MusicBrainz when a reviewed item has no association', async ({ assert }) => {
    const { musicBrainz, useCase } = makeUseCase(
      [
        {
          platform: 'musicbrainz-only',
          label: 'MusicBrainz only',
          url: 'https://example.test/musicbrainz',
          category: 'stream',
          source: 'musicbrainz',
        },
      ],
      [
        {
          platform: 'qobuz',
          label: 'Qobuz',
          url: 'https://www.qobuz.com/fr-fr/album/example/1',
          category: 'buy',
          source: 'platform-search',
        },
      ]
    )

    const result = await useCase.execute(
      undefined,
      SearchType.track,
      ['Artist'],
      'Song',
      'fr-FR',
      'https://open.spotify.com/track/source'
    )

    assert.equal(musicBrainz.calls, 0)
    assert.sameDeepMembers(
      result.map(({ platform, source }) => ({ platform, source })),
      [
        { platform: 'qobuz', source: 'platform-search' },
        { platform: 'spotify', source: 'source-url' },
      ]
    )
  })

  test('preserves the original source alongside a different result on the same platform', async ({
    assert,
  }) => {
    const sourceUrl = 'https://open.spotify.com/track/source-recording'
    const { useCase } = makeUseCase(
      [],
      [
        {
          platform: 'spotify',
          label: 'Spotify',
          url: 'https://open.spotify.com/track/other-recording',
          category: 'stream',
          source: 'platform-search',
        },
      ]
    )
    const result = await useCase.execute(
      undefined,
      SearchType.track,
      ['Artist'],
      'Song',
      'en-US',
      sourceUrl
    )
    assert.deepEqual(result, [
      {
        platform: 'spotify',
        label: 'Spotify',
        url: sourceUrl,
        category: 'stream',
        source: 'source-url',
      },
      {
        platform: 'spotify',
        label: 'Spotify',
        url: 'https://open.spotify.com/track/other-recording',
        category: 'stream',
        source: 'platform-search',
      },
    ])
  })

  test('keeps the original Apple track URL and merges equivalent destinations by track ID', async ({
    assert,
  }) => {
    const sourceUrl = 'https://music.apple.com/us/song/instant-crush/1673536436?l=en'
    const appleLink = (url: string): ExternalLink => ({
      platform: 'apple-music',
      label: 'Apple Music',
      url,
      category: 'stream',
      source: 'musicbrainz',
    })
    const { useCase } = makeUseCase(
      [
        appleLink(
          'https://itunes.apple.com/gb/album/random-access-memories/617154241?i=1673536436&uo=4'
        ),
        appleLink('https://music.apple.com/us/album/random-access-memories/617154241?i=123'),
        appleLink('https://music.apple.com/us/album/random-access-memories/617154241'),
      ],
      [
        {
          ...appleLink('https://music.apple.com/fr/album/another-slug/617154241?i=1673536436'),
          source: 'platform-search',
        },
        {
          ...appleLink('https://music.apple.com/fr/song/another-recording/456'),
          source: 'platform-search',
        },
        {
          platform: 'deezer',
          label: 'Deezer',
          url: 'https://www.deezer.com/track/42',
          category: 'stream',
          source: 'platform-search',
        },
      ]
    )

    const result = await useCase.execute(
      'recording-id',
      SearchType.track,
      ['Artist'],
      'Song',
      'fr-FR',
      sourceUrl
    )

    assert.deepEqual(
      result.map(({ url, source }) => ({ url, source })),
      [
        { url: sourceUrl, source: 'source-url' },
        {
          url: 'https://music.apple.com/fr/album/random-access-memories/617154241?i=123',
          source: 'musicbrainz',
        },
        {
          url: 'https://music.apple.com/fr/album/random-access-memories/617154241',
          source: 'musicbrainz',
        },
        { url: 'https://music.apple.com/fr/song/another-recording/456', source: 'platform-search' },
        { url: 'https://www.deezer.com/track/42', source: 'platform-search' },
      ]
    )
  })

  test('deduplicates Apple albums by ID without merging tracks from that album', async ({
    assert,
  }) => {
    const sourceUrl = 'https://itunes.apple.com/us/album/old-slug/123?uo=4'
    const { useCase } = makeUseCase(
      [
        {
          platform: 'apple-music',
          label: 'Apple Music',
          url: 'https://music.apple.com/fr/album/new-slug/123',
          category: 'stream',
          source: 'musicbrainz',
        },
        {
          platform: 'apple-music',
          label: 'Apple Music',
          url: 'https://music.apple.com/fr/album/new-slug/123?i=456',
          category: 'stream',
          source: 'musicbrainz',
        },
      ],
      []
    )

    const result = await useCase.execute(
      'release-id',
      SearchType.album,
      ['Artist'],
      'Album',
      'en-US',
      sourceUrl
    )
    assert.deepEqual(
      result.map(({ url }) => url),
      [sourceUrl, 'https://music.apple.com/en/album/new-slug/123?i=456']
    )
  })
})
