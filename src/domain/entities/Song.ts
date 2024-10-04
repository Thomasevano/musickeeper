import type { Artist } from "./Artist";

export interface SongInterface {
  id: string
  name: string
  url: string
  artists: Artist[]
}

export class SongEntity {
  private readonly id: string;
  private readonly name: string;
  private readonly url: string;
  private readonly artists: Artist[];

  constructor(props: SongInterface) {
    this.id = props.id;
    this.name = props.name;
    this.url = props.url;
    this.artists = props.artists;
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getUrl(): string {
    return this.url;
  }

  getArtists(): Artist[] {
    return this.artists;
  }
}