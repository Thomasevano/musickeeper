import type { Song } from "./Song";

export class MusicEntity {
  private id: string;
  private title: string;
  private description: string;
  private songs: Song[];
  private author: string;
  private link: string;
  private imageUrl: string;

  constructor(
    id: string,
    title: string,
    description: string,
    songs: Song[],
    author: string,
    link: string,
    imageUrl: string
  ) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.songs = songs;
    this.author = author;
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

  getAuthor(): string {
    return this.author;
  }

  getLink(): string {
    return this.link;
  }

  getImageUrl(): string {
    return this.imageUrl;
  }
}