import { CoverArtGateway } from '#application/ports/cover_art.gateway.js'
import { coverArtArchiveApiClient } from './musicbrainz_client.js'

export class CoverArtArchiveGateway extends CoverArtGateway {
  async getThumbnailUrl(releaseId: string): Promise<string | null> {
    try {
      const coverArt = await coverArtArchiveApiClient.getReleaseCovers(releaseId)
      if (coverArt.images?.length) {
        return coverArt.images[0].thumbnails.small
      }
      return null
    } catch {
      return null
    }
  }
}
