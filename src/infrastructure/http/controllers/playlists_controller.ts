import type { HttpContext } from '@adonisjs/core/http'
import { PlaylistRepository } from '../../../application/repositories/playlist.repository.js'
import { inject } from '@adonisjs/core'
import JSZip from 'jszip'
import fs from 'node:fs'
import {
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
  SPOTIFY_USER_ID_COOKIE_NAME,
} from '../../../constants.js'
import { ExtractService } from '../../../application/services/extract.service.js'
import { ExtractSongsListToFileUseCase } from '../../../application/usecases/extract_track_list_to_file.usecase.js'
import { SpotifyPlaylistRepository } from '../../repositories/spotify_playlist.repository.js'

@inject()
export default class PlaylistsController {
  constructor(
    private playlistRepository: PlaylistRepository,
    private extractService: ExtractService,
    private extractSongsListToFileUseCase: ExtractSongsListToFileUseCase,
    private spotifyPlaylistRepository: SpotifyPlaylistRepository
  ) { }
  async index({ inertia, request, response }: HttpContext) {
    const spotifyAccessToken = request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)

    if (!spotifyAccessToken) {
      console.error('No access token found!')
    }

    const tokens = {
      accessToken: spotifyAccessToken,
      refreshToken: request.encryptedCookie(SPOTIFY_REFRESH_TOKEN_COOKIE_NAME),
      expiresAt: request.plainCookie(SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME),
      userId: request.plainCookie(SPOTIFY_USER_ID_COOKIE_NAME),
    }

    const playlistsRangeUrlQueryString = request.qs().url
    if (playlistsRangeUrlQueryString) {
      const nextSpotifyUserPlaylistsInfos = await this.playlistRepository.getUserPlaylistsInfos(
        spotifyAccessToken,
        playlistsRangeUrlQueryString
      )

      response.status(200).header('Content-Type', 'application/json').send({
        nextSpotifyUserPlaylistsInfos,
      })
    }

    const spotifyUserPlaylistsInfos =
      await this.playlistRepository.getCurrentUserPlaylistsInfos(spotifyAccessToken)

    return inertia.render(
      'playlists',
      {
        tokens,
        spotifyUserPlaylistsInfos,
      },
      {
        title: 'Playlists - MusicKeeper',
      }
    )
  }

  async extractCurrentUserPlaylistsInfos({ request, response }: HttpContext) {
    const token = request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)

    const downloads = await this.extractService.generateAllPlaylists(token)
    var zip = new JSZip()

    downloads.forEach((download) => {
      zip.file(download.fileName, download.playlistTracks.join('\n'))
    })
    const archive = await zip.generateAsync({ type: 'nodebuffer' })

    response.safeStatus(200)
    response.header('Content-Type', 'application/zip')
    response.header('Content-Disposition', 'attachment; filename="extracted-playlists.zip"')
    response.send(archive)
  }

  async extractPlaylist({ request, response }: HttpContext) {
    const token = request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)
    const requestQueryStrings = request.qs()

    const playlistTracksUrl = requestQueryStrings.playlistTracksUrl
    const playlistName = requestQueryStrings.playlistName

    this.extractSongsListToFileUseCase = new ExtractSongsListToFileUseCase(
      this.spotifyPlaylistRepository
    )

    const txtFile = await this.extractSongsListToFileUseCase.execute(playlistTracksUrl, token)

    response.safeStatus(200)
    response.header('Content-Type', 'application/text')
    response.header('Content-Disposition', `attachment; filename="${playlistName}.txt"`)
    response.send(txtFile)
  }
}
