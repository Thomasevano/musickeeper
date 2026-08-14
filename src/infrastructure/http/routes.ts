/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import env from '../env.js'
import router from '@adonisjs/core/services/router'
const HomeController = () => import('./controllers/home_controller.js')
const ListenLaterListController = () => import('./controllers/listen_later_list_controller.js')
const LinkController = () => import('./controllers/link_controller.js')
const LinksController = () => import('./controllers/links_controller.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.post('/oembed', [LinkController, 'oembed'])
    router.post('/apple-music', [LinkController, 'appleMusic'])
    router.post('/metadata', [LinkController, 'metadata'])
  })
  .prefix('/api/link')

router.get('/api/links', [LinksController, 'index'])

router
  .group(() => {
    router.get('/listen-later', [ListenLaterListController, 'index'])
  })
  .prefix('/library')

if (env.get('E2E_TEST_ROUTES', false)) {
  router.get('/__test/error-500', () => {
    throw new Error('deliberate test error')
  })
}
