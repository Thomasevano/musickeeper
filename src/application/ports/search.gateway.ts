import { IRecordingList, IReleaseList } from 'musicbrainz-api'

export abstract class SearchGateway {
  abstract searchItem(
    query: string,
    type?: string,
    artist?: string
  ): Promise<IRecordingList | IReleaseList>
}
