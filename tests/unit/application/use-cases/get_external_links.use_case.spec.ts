import { test } from '@japa/runner'
import { GetExternalLinksUseCase } from '#application/use-cases/get_external_links.use_case.js'
import { MusicBrainzExternalLinksPort } from '#application/ports/musicbrainz_external_links.port.js'
import { PlatformSearchPort } from '#application/ports/platform_search.port.js'
import { type ExternalLink, SearchType } from '#domain/music_item.js'

class StubMusicBrainzLinksPort extends MusicBrainzExternalLinksPort {
  constructor(private links: ExternalLink[]) {
    super()
  }

  async fetchExternalLinks(): Promise<ExternalLink[]> {
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
  return new GetExternalLinksUseCase(
    new StubMusicBrainzLinksPort(musicBrainzLinks),
    new StubPlatformSearchPort(platformLinks)
  )
}

test.group('GetExternalLinksUseCase', () => {
  test('keeps the first link per platform and normalizes locale-sensitive URLs', async ({
    assert,
  }) => {
    const useCase = makeUseCase(
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
          url: 'https://open.spotify.com/album/from-search',
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

  test('adds a recognized source URL only when that platform is absent', async ({ assert }) => {
    const sourceUrl = 'https://music.youtube.com/watch?v=source'

    const added = await makeUseCase([], []).execute(
      'recording-id',
      SearchType.track,
      ['Artist'],
      'Song',
      'en-US',
      sourceUrl
    )
    const duplicate = await makeUseCase(
      [
        {
          platform: 'youtube-music',
          label: 'YouTube Music',
          url: 'https://music.youtube.com/watch?v=musicbrainz',
          category: 'stream',
          source: 'musicbrainz',
        },
      ],
      []
    ).execute('recording-id', SearchType.track, ['Artist'], 'Song', 'en-US', sourceUrl)

    assert.deepEqual(added, [
      {
        platform: 'youtube-music',
        label: 'YouTube Music',
        url: sourceUrl,
        category: 'stream',
        source: 'source-url',
      },
    ])
    assert.lengthOf(duplicate, 1)
    assert.equal(duplicate[0].url, 'https://music.youtube.com/watch?v=musicbrainz')
  })
})
