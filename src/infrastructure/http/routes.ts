/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import { middleware } from './kernel.js'
const SpotifyController = () => import('./controllers/spotify_controller.js')
const HomeController = () => import('./controllers/home_controller.js')
const PlaylistsController = () => import('./controllers/playlists_controller.js')
const AlbumsController = () => import('./controllers/albums_controller.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.get('login', [SpotifyController, 'login'])
    router.get('callback', [SpotifyController, 'callback']).use(middleware.shareUser())
    router.get('refresh', [SpotifyController, 'refreshToken'])
    router.get('logout', [SpotifyController, 'logout'])
  })
  .prefix('/spotify')
  .prefix('/auth')

router
  .group(() => {
    router
      .group(() => {
        router.get('/', [PlaylistsController, 'index'])
        router.get('extract', [PlaylistsController, 'extractPlaylist'])
        router.get('archive', [PlaylistsController, 'extractCurrentUserPlaylistsInfos'])
      })
      .prefix('/playlists')

    router
      .group(() => {
        router.get('/', [AlbumsController, 'index'])
      })
      .prefix('/albums')
  })
  .prefix('/library')
  .use(middleware.spotifyAuthCheck())
  .use(middleware.spotifyRefreshToken())
  .use(middleware.shareUser())
