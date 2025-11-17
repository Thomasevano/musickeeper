export abstract class SearchRepository {
  abstract searchItem(query: string, token: string, type?: string): Promise<SpotifyApi.SearchResponse>
}
