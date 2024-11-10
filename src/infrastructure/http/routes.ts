/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const SpotifyController = () => import('./controllers/spotify_controller.js')
const HomeController = () => import('./controllers/home_controller.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.get('login', [SpotifyController, 'login'])
    router.get('callback', [SpotifyController, 'callback'])
    router.get('refresh', [SpotifyController, 'refreshToken'])
    router.get('logout', [SpotifyController, 'logout'])
  })
  .prefix('/auth')
router
  .group(() => {
    router
      .group(() => {
        router.get(':id/playlists', [SpotifyController, 'getUserPlaylistsInfos'])
      })
      .prefix('/users')
    router
      .group(() => {
        router.get('playlists', [SpotifyController, 'getCurrentUserPlaylistsInfos'])
      })
      .prefix('/me')
  })
  .prefix('/spotify')
