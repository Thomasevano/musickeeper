import type { HttpContext } from '@adonisjs/core/http'
import { PlaylistRepository } from '../../../application/repositories/playlist.repository.js'
import { inject } from '@adonisjs/core'
import {
  SPOTIFY_ACCESS_TOKEN_COOKIE_NAME,
  SPOTIFY_ACCESS_TOKEN_EXPIRES_AT_COOKIE_NAME,
  SPOTIFY_REFRESH_TOKEN_COOKIE_NAME,
  SPOTIFY_USER_ID_COOKIE_NAME,
} from '../../../constants.js'
import { ExtractTracksFromPlaylistUseCase } from '../../../application/usecases/extract_tracks_from_playlist.usecase.js'
import { SpotifyPlaylistRepository } from '../../repositories/spotify/spotify_playlist.repository.js'
import { ArchiveAllPlaylistsUseCase } from '../../../application/usecases/archive_all_playlists.usecase.js'
@inject()
export default class PlaylistsController {
  constructor(
    private playlistRepository: PlaylistRepository,
    private extractTracksFromPlaylistUseCase: ExtractTracksFromPlaylistUseCase,
    private spotifyPlaylistRepository: SpotifyPlaylistRepository,
    private archiveAllPlaylistsUseCase: ArchiveAllPlaylistsUseCase
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

    const archive = await this.archiveAllPlaylistsUseCase.execute(token)

    response
      .safeStatus(200)
      .header('Content-Type', 'application/zip')
      .header('Content-Disposition', 'attachment; filename="extracted-playlists.zip"')
      .send(archive)
  }

  async extractPlaylist({ request, response }: HttpContext) {
    const token = request.encryptedCookie(SPOTIFY_ACCESS_TOKEN_COOKIE_NAME)
    const requestQueryStrings = request.qs()

    const playlistTracksUrl = requestQueryStrings.playlistTracksUrl
    const playlistName = requestQueryStrings.playlistName

    this.extractTracksFromPlaylistUseCase = new ExtractTracksFromPlaylistUseCase(
      this.spotifyPlaylistRepository
    )

    const trackList = await this.extractTracksFromPlaylistUseCase.execute(playlistTracksUrl, token)

    const txtFile = Buffer.from(trackList)

    response
      .safeStatus(200)
      .header('Content-Disposition', `attachment; filename="${encodeURIComponent(playlistName)}.txt"`)
      .send(txtFile)
  }
}
