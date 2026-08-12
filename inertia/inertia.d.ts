import type { InferSharedProps } from '@adonisjs/inertia/types'
import type InertiaMiddleware from '../src/infrastructure/http/middleware/inertia_middleware.js'

type ClientSharedProps = InferSharedProps<InertiaMiddleware>

declare module '@inertiajs/core' {
  interface InertiaConfig {
    sharedPageProps: ClientSharedProps
  }
}
