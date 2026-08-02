import { test } from '@japa/runner'
import { SearchPort } from '#application/ports/search.port.js'
import { EnrichMusicItemUseCase } from '#application/use-cases/enrich_music_item.use_case.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

function albumRelease(id: string, releaseDate: string, coverArt?: string) {
  return new MusicItem({
    id,
    title: 'Original Album',
    releaseDate,
    artists: ['Artist'],
    itemType: SearchType.album,
    albumName: 'Original Album',
    coverArt,
  })
}

const TRACK_RESULT = new MusicItem({
  id: 'track',
  title: 'Song',
  releaseDate: '2023-06-15',
  artists: ['Artist'],
  itemType: SearchType.track,
  // Differs from the hint, so the album lookup fires.
  albumName: 'Compilation',
  coverArt: 'https://covers.example/compilation.jpg',
})

/** A SearchPort whose album search returns exactly `albums`. */
function searchPortReturning(albums: MusicItem[]): SearchPort {
  return new (class extends SearchPort {
    async searchItem(_query: string, type: SearchType): Promise<MusicItem[]> {
      return type === SearchType.album ? albums : [TRACK_RESULT]
    }
  })()
}

const MATCHING_YEAR = 'https://covers.example/matching-year.jpg'

function useCaseWithAlbums(albums: MusicItem[]) {
  return new EnrichMusicItemUseCase(searchPortReturning(albums))
}

function enrich(useCase: EnrichMusicItemUseCase) {
  return useCase.execute('Song', 'Artist, Featured Artist', SearchType.track, 'Original Album')
}

test.group('EnrichMusicItemUseCase', () => {
  test('prefers the matching-year album cover', async ({ assert }) => {
    const result = await enrich(
      useCaseWithAlbums([
        albumRelease('wrong-year', '2020-01-01', 'https://covers.example/wrong-year.jpg'),
        albumRelease('matching-year', '2023-01-01', MATCHING_YEAR),
      ])
    )

    assert.equal(result?.coverArt, MATCHING_YEAR)
  })

  test('uses the only album cover returned by search', async ({ assert }) => {
    const result = await enrich(
      useCaseWithAlbums([albumRelease('only', '2023-01-01', 'https://covers.example/only.jpg')])
    )

    assert.equal(result?.coverArt, 'https://covers.example/only.jpg')
  })

  test('leaves cover art untouched when no album release carries one', async ({ assert }) => {
    const result = await enrich(useCaseWithAlbums([albumRelease('bare', '2023-01-01', undefined)]))

    assert.equal(result?.coverArt, TRACK_RESULT.coverArt)
  })
})
