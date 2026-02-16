/**
 * PWA Cache Configuration
 *
 * This module defines the caching strategies and configurations
 * used by the service worker for offline support.
 */

export interface CacheConfig {
  name: string
  maxEntries?: number
  maxAgeSeconds?: number
  networkTimeoutSeconds?: number
}

export interface CacheStrategy {
  type: 'NetworkFirst' | 'CacheFirst' | 'StaleWhileRevalidate'
  config: CacheConfig
}

/**
 * Pages cache configuration
 * Uses NetworkFirst strategy with 3 second timeout
 */
export const PAGES_CACHE: CacheStrategy = {
  type: 'NetworkFirst',
  config: {
    name: 'pages-cache',
    maxEntries: 50,
    maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
    networkTimeoutSeconds: 3,
  },
}

/**
 * Images cache configuration
 * Uses CacheFirst strategy for optimal performance
 */
export const IMAGES_CACHE: CacheStrategy = {
  type: 'CacheFirst',
  config: {
    name: 'images-cache',
    maxEntries: 100,
    maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
  },
}

/**
 * Fonts cache configuration
 * Uses CacheFirst strategy with long TTL
 */
export const FONTS_CACHE: CacheStrategy = {
  type: 'CacheFirst',
  config: {
    name: 'fonts-cache',
    maxEntries: 20,
    maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
  },
}

/**
 * All cache configurations
 */
export const CACHE_CONFIGS = {
  pages: PAGES_CACHE,
  images: IMAGES_CACHE,
  fonts: FONTS_CACHE,
} as const

/**
 * Validates that a request should be cached based on Accept header
 */
export function shouldCacheAsPage(acceptHeader: string | null, isInertiaRequest: boolean): boolean {
  if (isInertiaRequest) {
    return true
  }
  return acceptHeader?.includes('text/html') ?? false
}

/**
 * Checks if a request is an Inertia.js request
 */
export function isInertiaRequest(headers: { get: (name: string) => string | null }): boolean {
  return headers.get('X-Inertia') === 'true'
}

/**
 * Gets the request destination for determining cache strategy
 */
export function getRequestDestination(request: {
  destination: string
}): 'document' | 'image' | 'font' | 'other' {
  switch (request.destination) {
    case 'document':
      return 'document'
    case 'image':
      return 'image'
    case 'font':
      return 'font'
    default:
      return 'other'
  }
}

/**
 * Determines which cache strategy to use for a request
 */
export function getCacheStrategyForRequest(
  destination: ReturnType<typeof getRequestDestination>,
  isInertia: boolean
): CacheStrategy | null {
  if (destination === 'document' || isInertia) {
    return PAGES_CACHE
  }
  if (destination === 'image') {
    return IMAGES_CACHE
  }
  if (destination === 'font') {
    return FONTS_CACHE
  }
  return null
}

/**
 * Calculates if a cached item has expired
 */
export function isCacheExpired(cachedAt: Date, maxAgeSeconds: number): boolean {
  const now = new Date()
  const ageMs = now.getTime() - cachedAt.getTime()
  const maxAgeMs = maxAgeSeconds * 1000
  return ageMs > maxAgeMs
}

/**
 * Gets human-readable cache TTL
 */
export function formatCacheTTL(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} minutes`
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} hours`
  }
  return `${Math.floor(seconds / 86400)} days`
}
