import type { HttpContext } from '@adonisjs/core/http'
export default class HomeController {
  async index({ inertia }: HttpContext) {
    return inertia.render(
      'home',
      {},
      {
        title: 'MusicKeeper',
        description:
          'A simple app to keep track on music you want or have been recommanded to listen to',
      }
    )
  }
}
