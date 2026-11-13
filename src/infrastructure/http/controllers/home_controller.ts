import type { HttpContext } from '@adonisjs/core/http'
export default class HomeController {
  async qobuz({ inertia }: HttpContext) {
    return inertia.render(
      'qobuz',
      {},
      {
        title: 'Qobuz × MusicKeeper — Independent concept',
        description:
          'An independent product exploration: turn music discovery into deeper listening.',
      }
    )
  }

  async index({ inertia }: HttpContext) {
    return inertia.render(
      'home',
      {},
      {
        title: 'MusicKeeper',
        description:
          'A simple app to keep track of music you want or have been recommended to listen to',
      }
    )
  }
}
