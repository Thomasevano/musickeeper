import type { HttpContext } from '@adonisjs/core/http'
export default class HomeController {
  async qobuz({ inertia }: HttpContext) {
    return inertia.render(
      'qobuz',
      {},
      {
        title: 'Qobuz — À écouter plus tard · PoC MusicKeeper',
        description:
          'Prototype indépendant : une liste à écouter plus tard intégrée à la bibliothèque Qobuz, enregistrée uniquement dans ce navigateur.',
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
