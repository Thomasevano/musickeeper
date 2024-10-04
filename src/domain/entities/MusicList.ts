import { type SongInterface } from "./Song";

export interface MusicListInterface {
  id: string
  title: string
  description: string
  songs: SongInterface[]
  link: string
  imageUrl: string
}

export class MusicListEntity {
  private readonly id: string;
  private readonly title: string;
  private readonly description: string;
  private readonly songs: SongInterface[];
  private readonly link: string;
  private readonly imageUrl: string;

  constructor(props: MusicListInterface) {
    this.id = props.id;
    this.title = props.title;
    this.description = props.description;
    this.songs = props.songs;
    this.link = props.link;
    this.imageUrl = props.imageUrl;
  }

  getTitle(): string {
    return this.title;
  }

  getDescription(): string {
    return this.description;
  }

  getSongs(): SongInterface[] {
    return this.songs;
  }

  getLink(): string {
    return this.link;
  }

  getImageUrl(): string {
    return this.imageUrl;
  }
}