import { router, type Page } from '@inertiajs/core'

export const appUpdate = $state({ available: false, error: '' })
let loadedVersion: string | null = null
let checking: Promise<string> | undefined
let lastCheck = -Infinity

function versionIdentity(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9._-]{1,256}$/.test(value)
}

function observeVersion(version: unknown) {
  if (loadedVersion !== null && versionIdentity(version) && version !== loadedVersion) {
    appUpdate.available = true
  }
}

export async function appFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init)
  observeVersion(response.headers.get('X-App-Version'))
  return response
}

export function checkForUpdate(): Promise<string> {
  if (checking) return checking
  checking = (async () => {
    const response = await fetch('/app-version', {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok)
      throw new Error('The update could not be checked. Please try again when online.')
    const data: unknown = await response.json()
    if (
      !data ||
      typeof data !== 'object' ||
      !('version' in data) ||
      !versionIdentity(data.version)
    ) {
      throw new Error('The update could not be checked. Please try again later.')
    }
    observeVersion(data.version)
    lastCheck = Date.now()
    return data.version
  })().finally(() => {
    checking = undefined
  })
  return checking
}

export function initializeAppUpdate(page: Pick<Page, 'version' | 'url'>): () => void {
  const { version } = page
  loadedVersion = version
  const url = new URL(window.location.href)
  const expectedVersion = url.searchParams.get('__mk_update')
  if (expectedVersion) {
    if (expectedVersion !== version) {
      appUpdate.available = true
      appUpdate.error = 'The update could not be loaded. Please try again when online.'
    }
    url.searchParams.delete('__mk_update')
    page.url = url.pathname + url.search + url.hash
    window.history.replaceState(window.history.state, '', url)
  }

  const checkWhenVisible = () => {
    if (document.visibilityState !== 'visible' || Date.now() - lastCheck < 1_000) return
    void checkForUpdate().catch(() => {
      /* A failed check says nothing about the deployed version. */
    })
  }
  document.addEventListener('visibilitychange', checkWhenVisible)
  window.addEventListener('online', checkWhenVisible)
  const removeLocation = router.on('location', (event) => {
    if (!event.detail.versionChange) return
    event.preventDefault()
    // Inertia has already established a mismatch. Do not replace the running page.
    appUpdate.available = true
  })

  return () => {
    document.removeEventListener('visibilitychange', checkWhenVisible)
    window.removeEventListener('online', checkWhenVisible)
    removeLocation()
  }
}

async function prepareServiceWorker() {
  if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) return
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new Error('The update could not be prepared. Please try again.')
  await registration.update()
  const worker = registration.installing ?? registration.waiting
  if (!worker) return
  const { promise, resolve, reject } = Promise.withResolvers<void>()
  const timer = setTimeout(
    () => finish(new Error('The update is not ready. Please try again.')),
    15_000
  )
  const finish = (error?: Error) => {
    clearTimeout(timer)
    worker.removeEventListener('statechange', changed)
    navigator.serviceWorker.removeEventListener('controllerchange', changed)
    if (error) reject(error)
    else resolve()
  }
  const changed = () => {
    if (worker.state === 'redundant') finish(new Error('The update could not be installed.'))
    else if (worker.state === 'activated' && navigator.serviceWorker.controller === worker) finish()
    else if (worker.state === 'installed') worker.postMessage({ type: 'SKIP_WAITING' })
  }
  worker.addEventListener('statechange', changed)
  navigator.serviceWorker.addEventListener('controllerchange', changed)
  changed()
  await promise
}

export async function prepareReload(): Promise<URL> {
  if (!navigator.onLine) throw new Error('Reconnect before reloading MusicKeeper.')
  await prepareServiceWorker()
  const version = await checkForUpdate()
  const url = new URL(window.location.href)
  url.searchParams.set('__mk_update', version)
  return url
}
