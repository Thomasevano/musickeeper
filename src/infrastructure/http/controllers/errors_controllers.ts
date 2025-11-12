import { inject } from '@adonisjs/core'

import { HttpContext } from '@adonisjs/core/http'
@inject()
export default class ErrorsController {
  constructor() { }

  unauthorizedAccess({ inertia }: HttpContext) {
    return inertia.render(
      'errors/unauthorized_access',
      {},
      {
        title: 'Unauthorized Access - MusicKeeper',
      }
    )
  }
}
