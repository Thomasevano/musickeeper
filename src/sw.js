import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Precache assets injected by workbox
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// NetworkFirst strategy for pages
const pageStrategy = new NetworkFirst({
  cacheName: 'pages-cache',
  networkTimeoutSeconds: 3,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
    }),
  ],
})

// Cache navigation requests (full page loads)
const navigationRoute = new NavigationRoute(pageStrategy, {
  // Cache all navigation requests
  allowlist: [/^\//, /^\/library\//],
})
registerRoute(navigationRoute)

// Also cache same-origin HTML fetch requests (for Inertia.js)
registerRoute(({ request, sameOrigin }) => {
  if (!sameOrigin) return false
  const acceptHeader = request.headers.get('Accept') || ''
  const isInertia = request.headers.get('X-Inertia') === 'true'
  const acceptsHtml = acceptHeader.includes('text/html')
  return isInertia || acceptsHtml
}, pageStrategy)

// Cache images
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
)

// Cache fonts
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 20,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
)

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// Skip waiting to activate immediately
self.addEventListener('install', () => self.skipWaiting())

// Take control of all clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
