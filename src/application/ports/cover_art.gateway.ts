export abstract class CoverArtGateway {
  abstract getThumbnailUrl(releaseId: string): Promise<string | null>
}
