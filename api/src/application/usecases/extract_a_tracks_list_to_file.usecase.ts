import { PlaylistRequestDTO } from '../dtos/playlist_request.dto.js'
import { ExtractService } from '../services/extract.service.js'

export class ExtractSongsListToFileUseCase {
  constructor(private extractService: ExtractService) { }

  execute(payload: PlaylistRequestDTO): void { }
}
