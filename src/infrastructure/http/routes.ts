/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const HomeController = () => import('./controllers/home_controller.js')
const ListenLaterListController = () => import('./controllers/listen_later_list_controller.js')

router.get('/', [HomeController, 'index'])

router
  .group(() => {
    router.get('/listen-later', [ListenLaterListController, 'index'])
  })
  .prefix('/library')
