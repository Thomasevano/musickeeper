import { readFileSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import BaseInertiaMiddleware from '@adonisjs/inertia/inertia_middleware'

const packageJson = JSON.parse(
  readFileSync(new URL('../../../../../package.json', import.meta.url), 'utf8')
)

export default class InertiaMiddleware extends BaseInertiaMiddleware {
  share(ctx: HttpContext) {
    const anyCtx = ctx as any
    return {
      appName: packageJson.name as string,
      appVersion: packageJson.version as string,
      errors: ctx.inertia.always(this.getValidationErrors(ctx)),
      flash: ctx.inertia.always({
        error: anyCtx.session?.flashMessages.get('error') as string | null,
        success: anyCtx.session?.flashMessages.get('success') as string | null,
      }),
      user: ctx.inertia.always(anyCtx.auth?.user ?? undefined),
    }
  }

  async handle(ctx: HttpContext, next: NextFn) {
    await this.init(ctx)
    const output = await next()
    this.dispose(ctx)
    return output
  }
}

declare module '@adonisjs/inertia/types' {
  export interface SharedProps {
    appName: string
    appVersion: string
    errors: Record<string, string[]>
    flash: { error: string | null; success: string | null }
    user: any
  }
}
