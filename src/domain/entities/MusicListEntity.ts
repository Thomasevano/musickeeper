import type { Song } from "../dtos/Song";

export class MusicListEntity {
  private readonly id: string;
  private readonly title: string;
  private readonly description: string;
  private readonly songs: Song[];
  private readonly link: string;
  private readonly imageUrl: string;

  constructor(
    id: string,
    title: string,
    description: string,
    songs: Song[],
    link: string,
    imageUrl: string
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.songs = songs;
    this.link = link;
    this.imageUrl = imageUrl;
  }

  getSongs(): Song[] {
    return this.songs;
  }

  getDescription(): string {
    return this.description;
  }

  getTitle(): string {
    return this.title;
  }

  getLink(): string {
    return this.link;
  }

  getImageUrl(): string {
    return this.imageUrl;
  }
}