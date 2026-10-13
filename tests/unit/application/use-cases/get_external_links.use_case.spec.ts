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
  return {
    musicBrainz,
    useCase: new GetExternalLinksUseCase(musicBrainz, new StubPlatformSearchPort(platformLinks)),
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
})
