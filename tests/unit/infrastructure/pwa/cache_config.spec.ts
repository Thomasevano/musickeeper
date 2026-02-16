import { test } from '@japa/runner'
import {
  PAGES_CACHE,
  IMAGES_CACHE,
  FONTS_CACHE,
  CACHE_CONFIGS,
  shouldCacheAsPage,
  isInertiaRequest,
  getRequestDestination,
  getCacheStrategyForRequest,
  isCacheExpired,
  formatCacheTTL,
} from '../../../../src/infrastructure/pwa/cache_config.js'

test.group('Cache Config - Configuration Values', () => {
  test('PAGES_CACHE has correct configuration', async ({ assert }) => {
    assert.equal(PAGES_CACHE.type, 'NetworkFirst')
    assert.equal(PAGES_CACHE.config.name, 'pages-cache')
    assert.equal(PAGES_CACHE.config.maxEntries, 50)
    assert.equal(PAGES_CACHE.config.maxAgeSeconds, 60 * 60 * 24 * 7) // 7 days
    assert.equal(PAGES_CACHE.config.networkTimeoutSeconds, 3)
  })

  test('IMAGES_CACHE has correct configuration', async ({ assert }) => {
    assert.equal(IMAGES_CACHE.type, 'CacheFirst')
    assert.equal(IMAGES_CACHE.config.name, 'images-cache')
    assert.equal(IMAGES_CACHE.config.maxEntries, 100)
    assert.equal(IMAGES_CACHE.config.maxAgeSeconds, 60 * 60 * 24 * 30) // 30 days
    assert.isUndefined(IMAGES_CACHE.config.networkTimeoutSeconds)
  })

  test('FONTS_CACHE has correct configuration', async ({ assert }) => {
    assert.equal(FONTS_CACHE.type, 'CacheFirst')
    assert.equal(FONTS_CACHE.config.name, 'fonts-cache')
    assert.equal(FONTS_CACHE.config.maxEntries, 20)
    assert.equal(FONTS_CACHE.config.maxAgeSeconds, 60 * 60 * 24 * 365) // 1 year
    assert.isUndefined(FONTS_CACHE.config.networkTimeoutSeconds)
  })

  test('CACHE_CONFIGS contains all cache configurations', async ({ assert }) => {
    assert.deepEqual(CACHE_CONFIGS.pages, PAGES_CACHE)
    assert.deepEqual(CACHE_CONFIGS.images, IMAGES_CACHE)
    assert.deepEqual(CACHE_CONFIGS.fonts, FONTS_CACHE)
  })

  test('all cache names are unique', async ({ assert }) => {
    const names = [PAGES_CACHE.config.name, IMAGES_CACHE.config.name, FONTS_CACHE.config.name]
    const uniqueNames = new Set(names)
    assert.equal(uniqueNames.size, names.length)
  })
})

test.group('Cache Config - shouldCacheAsPage', () => {
  test('returns true for Inertia requests', async ({ assert }) => {
    const result = shouldCacheAsPage(null, true)
    assert.isTrue(result)
  })

  test('returns true for Inertia requests regardless of Accept header', async ({ assert }) => {
    const result = shouldCacheAsPage('application/json', true)
    assert.isTrue(result)
  })

  test('returns true for HTML Accept header', async ({ assert }) => {
    const result = shouldCacheAsPage('text/html', false)
    assert.isTrue(result)
  })

  test('returns true for Accept header containing text/html', async ({ assert }) => {
    const result = shouldCacheAsPage('text/html,application/xhtml+xml,application/xml;q=0.9', false)
    assert.isTrue(result)
  })

  test('returns false for non-HTML Accept header', async ({ assert }) => {
    const result = shouldCacheAsPage('application/json', false)
    assert.isFalse(result)
  })

  test('returns false for null Accept header when not Inertia', async ({ assert }) => {
    const result = shouldCacheAsPage(null, false)
    assert.isFalse(result)
  })

  test('returns false for empty Accept header', async ({ assert }) => {
    const result = shouldCacheAsPage('', false)
    assert.isFalse(result)
  })
})

test.group('Cache Config - isInertiaRequest', () => {
  test('returns true when X-Inertia header is "true"', async ({ assert }) => {
    const headers = {
      get: (name: string) => (name === 'X-Inertia' ? 'true' : null),
    }

    const result = isInertiaRequest(headers)
    assert.isTrue(result)
  })

  test('returns false when X-Inertia header is not present', async ({ assert }) => {
    const headers = {
      get: () => null,
    }

    const result = isInertiaRequest(headers)
    assert.isFalse(result)
  })

  test('returns false when X-Inertia header is "false"', async ({ assert }) => {
    const headers = {
      get: (name: string) => (name === 'X-Inertia' ? 'false' : null),
    }

    const result = isInertiaRequest(headers)
    assert.isFalse(result)
  })

  test('returns false when X-Inertia header has other value', async ({ assert }) => {
    const headers = {
      get: (name: string) => (name === 'X-Inertia' ? 'yes' : null),
    }

    const result = isInertiaRequest(headers)
    assert.isFalse(result)
  })
})

test.group('Cache Config - getRequestDestination', () => {
  test('returns "document" for document destination', async ({ assert }) => {
    const request = { destination: 'document' }
    const result = getRequestDestination(request)
    assert.equal(result, 'document')
  })

  test('returns "image" for image destination', async ({ assert }) => {
    const request = { destination: 'image' }
    const result = getRequestDestination(request)
    assert.equal(result, 'image')
  })

  test('returns "font" for font destination', async ({ assert }) => {
    const request = { destination: 'font' }
    const result = getRequestDestination(request)
    assert.equal(result, 'font')
  })

  test('returns "other" for script destination', async ({ assert }) => {
    const request = { destination: 'script' }
    const result = getRequestDestination(request)
    assert.equal(result, 'other')
  })

  test('returns "other" for style destination', async ({ assert }) => {
    const request = { destination: 'style' }
    const result = getRequestDestination(request)
    assert.equal(result, 'other')
  })

  test('returns "other" for empty destination', async ({ assert }) => {
    const request = { destination: '' }
    const result = getRequestDestination(request)
    assert.equal(result, 'other')
  })
})

test.group('Cache Config - getCacheStrategyForRequest', () => {
  test('returns PAGES_CACHE for document destination', async ({ assert }) => {
    const result = getCacheStrategyForRequest('document', false)
    assert.deepEqual(result, PAGES_CACHE)
  })

  test('returns PAGES_CACHE for Inertia requests', async ({ assert }) => {
    const result = getCacheStrategyForRequest('other', true)
    assert.deepEqual(result, PAGES_CACHE)
  })

  test('returns IMAGES_CACHE for image destination', async ({ assert }) => {
    const result = getCacheStrategyForRequest('image', false)
    assert.deepEqual(result, IMAGES_CACHE)
  })

  test('returns FONTS_CACHE for font destination', async ({ assert }) => {
    const result = getCacheStrategyForRequest('font', false)
    assert.deepEqual(result, FONTS_CACHE)
  })

  test('returns null for other destinations', async ({ assert }) => {
    const result = getCacheStrategyForRequest('other', false)
    assert.isNull(result)
  })

  test('Inertia request takes precedence over destination', async ({ assert }) => {
    // Even if destination is image, Inertia request should use pages cache
    const result = getCacheStrategyForRequest('image', true)
    assert.deepEqual(result, PAGES_CACHE)
  })
})

test.group('Cache Config - isCacheExpired', () => {
  test('returns false for item cached just now', async ({ assert }) => {
    const cachedAt = new Date()
    const maxAgeSeconds = 3600 // 1 hour

    const result = isCacheExpired(cachedAt, maxAgeSeconds)
    assert.isFalse(result)
  })

  test('returns true for item cached beyond max age', async ({ assert }) => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    const maxAgeSeconds = 3600 // 1 hour

    const result = isCacheExpired(twoHoursAgo, maxAgeSeconds)
    assert.isTrue(result)
  })

  test('returns false for item cached within max age', async ({ assert }) => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
    const maxAgeSeconds = 3600 // 1 hour

    const result = isCacheExpired(thirtyMinutesAgo, maxAgeSeconds)
    assert.isFalse(result)
  })

  test('returns true for item cached exactly at max age boundary', async ({ assert }) => {
    const exactlyOneHourAgo = new Date(Date.now() - 3600 * 1000 - 1) // Just over 1 hour ago
    const maxAgeSeconds = 3600 // 1 hour

    const result = isCacheExpired(exactlyOneHourAgo, maxAgeSeconds)
    assert.isTrue(result)
  })

  test('handles very short TTLs', async ({ assert }) => {
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000)
    const maxAgeSeconds = 5

    const result = isCacheExpired(tenSecondsAgo, maxAgeSeconds)
    assert.isTrue(result)
  })

  test('handles very long TTLs', async ({ assert }) => {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const maxAgeSeconds = 365 * 24 * 60 * 60 // 1 year

    const result = isCacheExpired(oneWeekAgo, maxAgeSeconds)
    assert.isFalse(result)
  })
})

test.group('Cache Config - formatCacheTTL', () => {
  test('formats seconds', async ({ assert }) => {
    assert.equal(formatCacheTTL(30), '30 seconds')
    assert.equal(formatCacheTTL(1), '1 seconds')
    assert.equal(formatCacheTTL(59), '59 seconds')
  })

  test('formats minutes', async ({ assert }) => {
    assert.equal(formatCacheTTL(60), '1 minutes')
    assert.equal(formatCacheTTL(120), '2 minutes')
    assert.equal(formatCacheTTL(3599), '59 minutes')
  })

  test('formats hours', async ({ assert }) => {
    assert.equal(formatCacheTTL(3600), '1 hours')
    assert.equal(formatCacheTTL(7200), '2 hours')
    assert.equal(formatCacheTTL(86399), '23 hours')
  })

  test('formats days', async ({ assert }) => {
    assert.equal(formatCacheTTL(86400), '1 days')
    assert.equal(formatCacheTTL(172800), '2 days')
    assert.equal(formatCacheTTL(604800), '7 days') // 1 week
    assert.equal(formatCacheTTL(31536000), '365 days') // 1 year
  })

  test('formats actual cache config values correctly', async ({ assert }) => {
    assert.equal(formatCacheTTL(PAGES_CACHE.config.maxAgeSeconds!), '7 days')
    assert.equal(formatCacheTTL(IMAGES_CACHE.config.maxAgeSeconds!), '30 days')
    assert.equal(formatCacheTTL(FONTS_CACHE.config.maxAgeSeconds!), '365 days')
  })
})

test.group('Cache Config - Strategy Types', () => {
  test('NetworkFirst is used for pages (prioritizes fresh content)', async ({ assert }) => {
    // NetworkFirst means: try network first, fall back to cache
    // This is appropriate for HTML pages that may change frequently
    assert.equal(PAGES_CACHE.type, 'NetworkFirst')
  })

  test('CacheFirst is used for images (prioritizes speed)', async ({ assert }) => {
    // CacheFirst means: serve from cache first, only fetch from network if not cached
    // This is appropriate for images that rarely change
    assert.equal(IMAGES_CACHE.type, 'CacheFirst')
  })

  test('CacheFirst is used for fonts (prioritizes speed)', async ({ assert }) => {
    // CacheFirst is ideal for fonts which are static resources
    assert.equal(FONTS_CACHE.type, 'CacheFirst')
  })

  test('pages cache has network timeout for offline fallback', async ({ assert }) => {
    // Network timeout ensures the app falls back to cache quickly when offline
    assert.isDefined(PAGES_CACHE.config.networkTimeoutSeconds)
    assert.equal(PAGES_CACHE.config.networkTimeoutSeconds, 3)
  })
})
