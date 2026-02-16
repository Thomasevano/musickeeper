import { test } from '@japa/runner'
import {
  createOfflineDetector,
  getInitialOfflineState,
  shouldDisableFeature,
  getOfflinePlaceholder,
} from '../../../../src/infrastructure/network/offline_detector.js'

// Mock window and navigator for testing
function createMockWindow() {
  const listeners: Record<string, Set<EventListener>> = {
    online: new Set(),
    offline: new Set(),
  }

  return {
    addEventListener(event: string, handler: EventListener) {
      if (listeners[event]) {
        listeners[event].add(handler)
      }
    },
    removeEventListener(event: string, handler: EventListener) {
      if (listeners[event]) {
        listeners[event].delete(handler)
      }
    },
    dispatchEvent(eventType: string) {
      if (listeners[eventType]) {
        listeners[eventType].forEach((handler) => handler(new Event(eventType)))
      }
    },
    getListenerCount(eventType: string) {
      return listeners[eventType]?.size ?? 0
    },
  }
}

function createMockNavigator(online: boolean) {
  return {
    onLine: online,
  }
}

test.group('Offline Detector - createOfflineDetector', () => {
  test('creates detector with initial online state', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()

    const detector = createOfflineDetector(
      {},
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    assert.isFalse(detector.isOffline)
  })

  test('creates detector with initial offline state', async ({ assert }) => {
    const mockNavigator = createMockNavigator(false)
    const mockWindow = createMockWindow()

    const detector = createOfflineDetector(
      {},
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    assert.isTrue(detector.isOffline)
  })

  test('start() adds event listeners', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()

    const detector = createOfflineDetector(
      {},
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    assert.equal(mockWindow.getListenerCount('online'), 0)
    assert.equal(mockWindow.getListenerCount('offline'), 0)

    detector.start()

    assert.equal(mockWindow.getListenerCount('online'), 1)
    assert.equal(mockWindow.getListenerCount('offline'), 1)
  })

  test('stop() removes event listeners', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()

    const detector = createOfflineDetector(
      {},
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()
    assert.equal(mockWindow.getListenerCount('online'), 1)
    assert.equal(mockWindow.getListenerCount('offline'), 1)

    detector.stop()
    assert.equal(mockWindow.getListenerCount('online'), 0)
    assert.equal(mockWindow.getListenerCount('offline'), 0)
  })

  test('responds to offline event', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()
    let offlineCallbackCalled = false

    const detector = createOfflineDetector(
      {
        onOffline: () => {
          offlineCallbackCalled = true
        },
      },
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()
    assert.isFalse(detector.isOffline)
    assert.isFalse(offlineCallbackCalled)

    mockWindow.dispatchEvent('offline')

    assert.isTrue(detector.isOffline)
    assert.isTrue(offlineCallbackCalled)
  })

  test('responds to online event', async ({ assert }) => {
    const mockNavigator = createMockNavigator(false) // Start offline
    const mockWindow = createMockWindow()
    let onlineCallbackCalled = false

    const detector = createOfflineDetector(
      {
        onOnline: () => {
          onlineCallbackCalled = true
        },
      },
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()
    assert.isTrue(detector.isOffline)
    assert.isFalse(onlineCallbackCalled)

    mockWindow.dispatchEvent('online')

    assert.isFalse(detector.isOffline)
    assert.isTrue(onlineCallbackCalled)
  })

  test('handles multiple online/offline transitions', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()
    const transitions: string[] = []

    const detector = createOfflineDetector(
      {
        onOnline: () => transitions.push('online'),
        onOffline: () => transitions.push('offline'),
      },
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()

    mockWindow.dispatchEvent('offline')
    mockWindow.dispatchEvent('online')
    mockWindow.dispatchEvent('offline')
    mockWindow.dispatchEvent('online')

    assert.deepEqual(transitions, ['offline', 'online', 'offline', 'online'])
    assert.isFalse(detector.isOffline)
  })

  test('does not call callbacks after stop()', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()
    let callbackCount = 0

    const detector = createOfflineDetector(
      {
        onOffline: () => callbackCount++,
      },
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()
    mockWindow.dispatchEvent('offline')
    assert.equal(callbackCount, 1)

    detector.stop()
    mockWindow.dispatchEvent('offline')
    assert.equal(callbackCount, 1) // Should not increase
  })
})

test.group('Offline Detector - getInitialOfflineState', () => {
  test('returns false when navigator.onLine is true', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)

    const result = getInitialOfflineState(mockNavigator as unknown as Navigator)

    assert.isFalse(result)
  })

  test('returns true when navigator.onLine is false', async ({ assert }) => {
    const mockNavigator = createMockNavigator(false)

    const result = getInitialOfflineState(mockNavigator as unknown as Navigator)

    assert.isTrue(result)
  })

  test('returns false when navigator.onLine is undefined', async ({ assert }) => {
    const mockNavigator = {} // No onLine property

    const result = getInitialOfflineState(mockNavigator as unknown as Navigator)

    assert.isFalse(result)
  })
})

test.group('Offline Detector - shouldDisableFeature', () => {
  test('returns true when offline and feature requires network', async ({ assert }) => {
    const result = shouldDisableFeature(true, true)
    assert.isTrue(result)
  })

  test('returns false when online and feature requires network', async ({ assert }) => {
    const result = shouldDisableFeature(false, true)
    assert.isFalse(result)
  })

  test('returns false when offline but feature does not require network', async ({ assert }) => {
    const result = shouldDisableFeature(true, false)
    assert.isFalse(result)
  })

  test('returns false when online and feature does not require network', async ({ assert }) => {
    const result = shouldDisableFeature(false, false)
    assert.isFalse(result)
  })
})

test.group('Offline Detector - getOfflinePlaceholder', () => {
  test('returns online placeholder when online', async ({ assert }) => {
    const result = getOfflinePlaceholder(
      false,
      'Search a song or album title...',
      'Search disabled while offline'
    )

    assert.equal(result, 'Search a song or album title...')
  })

  test('returns offline placeholder when offline', async ({ assert }) => {
    const result = getOfflinePlaceholder(
      true,
      'Search a song or album title...',
      'Search disabled while offline'
    )

    assert.equal(result, 'Search disabled while offline')
  })

  test('works with empty strings', async ({ assert }) => {
    const resultOnline = getOfflinePlaceholder(false, '', 'Offline')
    const resultOffline = getOfflinePlaceholder(true, 'Online', '')

    assert.equal(resultOnline, '')
    assert.equal(resultOffline, '')
  })
})

test.group('Offline Detector - Edge Cases', () => {
  test('handles missing addEventListener gracefully', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = {} // No addEventListener

    const detector = createOfflineDetector(
      {},
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    // Should not throw
    detector.start()
    detector.stop()

    assert.isFalse(detector.isOffline)
  })

  test('handles options without callbacks', async ({ assert }) => {
    const mockNavigator = createMockNavigator(true)
    const mockWindow = createMockWindow()

    const detector = createOfflineDetector(
      {}, // No callbacks
      mockWindow as unknown as Window,
      mockNavigator as unknown as Navigator
    )

    detector.start()

    // Should not throw when events are dispatched
    mockWindow.dispatchEvent('offline')
    mockWindow.dispatchEvent('online')

    assert.isFalse(detector.isOffline)
  })
})
