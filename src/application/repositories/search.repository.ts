export abstract class SearchRepository {
  abstract searchItem(query: string, token: string): Promise<SpotifyApi.SearchResponse>
}
