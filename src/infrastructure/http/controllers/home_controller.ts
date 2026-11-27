import type { HttpContext } from '@adonisjs/core/http'
export default class HomeController {
  async index({ inertia }: HttpContext) {
    return inertia.render(
      'home',
      {},
      {
        title: 'MusicKeeper — Save music for later',
        description:
          'Save the tracks and albums you mean to listen to. Paste a link or search, then come back when you’re ready. No account. Just your music.',
      }
    )
  }
}
