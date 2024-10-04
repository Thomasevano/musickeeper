import { MusicListEntity } from './MusicList'
import { type MusicListInterface } from './MusicList'
export interface PlaylistInterface extends MusicListInterface {
  owner: string
}
export class PlaylistEntity extends MusicListEntity {
  private readonly owner: string;

  constructor(props: PlaylistInterface) {
    super({ id: props.id, title: props.title, description: props.description, songs: props.songs, link: props.link, imageUrl: props.imageUrl })
    this.owner = props.owner
  }

  getOwner(): string {
    return this.owner
  }
}