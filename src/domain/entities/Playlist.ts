import { MusicListEntity } from './MusicListEntity'
import { type Song } from '../dtos/Song'

class Playlist extends MusicListEntity {
  private readonly owner: string;

  constructor(id: string, title: string, description: string, songs: Song[], link: string, imageUrl: string, owner: string) {
    super(id, title, description, songs, link, imageUrl)
    this.owner = owner
  }

  getOwner(): string {
    return this.owner
  }
}