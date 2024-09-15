import { type Dictionary } from '../types'

export type FetchParams = {
  /**
   * Maximum number of entities to return.
   * Note the underscore prefix required by Typicode API.
   */
  limit: number;
  offset: number;
};

export interface SongsListGateway<T = Dictionary> {
  fetchSongsLists: Promise<T[]>;
}

export interface SongGateway<T = Dictionary> {
  fetchSongsBySongsListId(id: number): Promise<T>;
}

