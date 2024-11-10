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
const PlaylistController = () => import('./controllers/playlists_controller.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.get('login', [SpotifyController, 'login'])
    router.get('callback', [SpotifyController, 'callback'])
    router.get('refresh', [SpotifyController, 'refreshToken'])
    router.get('logout', [SpotifyController, 'logout'])
  })
  .prefix('/spotify')
  .prefix('/auth')

router
  .group(() => {
    router
      .group(() => {
        router.get('playlists', [PlaylistController, 'extractCurrentUserPlaylistsInfos'])
      })
      .prefix('/archive')

    router
      .group(() => {
        router.get('playlist', [PlaylistController, 'extractPlaylist'])
      })
      .prefix('/extract')

    router
      .group(() => {
        router.get('playlists', [PlaylistController, 'index'])
      })
      .prefix('/library')
  })
  .use(middleware.spotifyRefreshToken())
