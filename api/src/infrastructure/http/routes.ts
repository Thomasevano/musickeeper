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

router
  .group(async () => {
    router.get('/', async () => {
      return {
        hello: 'world',
      }
    })

    router
      .group(() => {
        router
          .group(() => {
            router.get('login', [SpotifyController, 'login'])
            router.get('callback', [SpotifyController, 'callback'])
            router.get('refresh', [SpotifyController, 'refreshToken'])
            router.get('logout', [SpotifyController, 'logout'])
          })
          .prefix('/spotify')
      })
      .prefix('/auth')
  })
  .prefix('/api')
