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
const ListenLaterListController = () => import('./controllers/listen_later_list_controller.js')
const ErrorsController = () => import('./controllers/errors_controllers.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.get('/listen-later', [ListenLaterListController, 'index'])
  })
  .prefix('/library')
