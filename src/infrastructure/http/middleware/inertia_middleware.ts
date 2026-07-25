import { readFileSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

const packageJson = JSON.parse(
  readFileSync(new URL('../../../../package.json', import.meta.url), 'utf8')
)

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    return {
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      appName: packageJson.name as string,
      appVersion: packageJson.version as string,
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)

    const output = await next()
    this.dispose(ctx)

    return output
  }
}

type MiddlewareSharedProps = InferSharedProps<InertiaMiddleware>

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends MiddlewareSharedProps {}
}
