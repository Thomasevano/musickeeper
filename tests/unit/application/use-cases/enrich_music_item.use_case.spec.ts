import { test } from '@japa/runner'
import { SearchGateway } from '#application/ports/search.gateway.js'
import { EnrichMusicItemUseCase } from '#application/use-cases/enrich_music_item.use_case.js'
import { MusicItem, SearchType } from '#domain/music_item.js'

class AlbumHintSearchGateway extends SearchGateway {
  async searchItem(_query: string, type?: SearchType): Promise<MusicItem[]> {
    if (type === SearchType.album) {
      return [
        new MusicItem({
          id: 'wrong-year',
          title: 'Original Album',
          releaseDate: '2020-01-01',
          artists: ['Artist'],
          itemType: SearchType.album,
          albumName: 'Original Album',
          coverArt: 'https://covers.example/wrong-year.jpg',
        }),
        new MusicItem({
          id: 'matching-year',
          title: 'Original Album',
          releaseDate: '2023-01-01',
          artists: ['Artist'],
          itemType: SearchType.album,
          albumName: 'Original Album',
          coverArt: 'https://covers.example/matching-year.jpg',
        }),
      ]
    }

    return [
      new MusicItem({
        id: 'track',
        title: 'Song',
        releaseDate: '2023-06-15',
        artists: ['Artist'],
        itemType: SearchType.track,
        albumName: 'Compilation',
        coverArt: 'https://covers.example/compilation.jpg',
      }),
    ]
  }
}

test.group('EnrichMusicItemUseCase', () => {
  test('reuses serialized cover art from the matching-year album', async ({ assert }) => {
    const useCase = new EnrichMusicItemUseCase(new AlbumHintSearchGateway())

    const result = await useCase.execute(
      'Song',
      'Artist, Featured Artist',
      SearchType.track,
      'Original Album'
    )

    assert.equal(result?.coverArt, 'https://covers.example/matching-year.jpg')
  })
})
