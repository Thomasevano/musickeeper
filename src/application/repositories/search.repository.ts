import { IRecordingList, IReleaseList } from 'musicbrainz-api'

export abstract class SearchRepository {
  abstract searchItem(query: string, type?: string): Promise<IRecordingList | IReleaseList>
}
