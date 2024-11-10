import type { HttpContext } from '@adonisjs/core/http'
export default class HomeController {
  async index({ inertia }: HttpContext) {
    return inertia.render(
      'home',
      {},
      {
        title: 'MusicKeeper - Music Manager',
        description:
          'Musickeeper a platform to extract an manage your music library from music streaming services',
      }
    )
  }
}
