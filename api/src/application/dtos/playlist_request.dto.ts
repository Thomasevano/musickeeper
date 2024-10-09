export class PlaylistRequestDTO {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public owner: string,
    public href: string,
    public imageUrl: string
  ) { }
}
