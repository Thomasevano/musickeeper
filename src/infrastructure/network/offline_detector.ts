/// <reference lib="dom" />

export interface OfflineDetectorOptions {
  onOnline?: () => void
  onOffline?: () => void
}

export interface OfflineDetector {
  isOffline: boolean
  start(): void
  stop(): void
}

/**
 * Creates an offline detector that monitors network status
 */
export function createOfflineDetector(
  options: OfflineDetectorOptions = {},
  windowInstance: Window = typeof window !== 'undefined' ? window : ({} as Window),
  navigatorInstance: Navigator = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
): OfflineDetector {
  let isOffline = !navigatorInstance.onLine

  const handleOnline = () => {
    isOffline = false
    options.onOnline?.()
  }

  const handleOffline = () => {
    isOffline = true
    options.onOffline?.()
  }

  return {
    get isOffline() {
      return isOffline
    },

    start() {
      if (windowInstance.addEventListener) {
        windowInstance.addEventListener('online', handleOnline)
        windowInstance.addEventListener('offline', handleOffline)
      }
    },

    stop() {
      if (windowInstance.removeEventListener) {
        windowInstance.removeEventListener('online', handleOnline)
        windowInstance.removeEventListener('offline', handleOffline)
      }
    },
  }
}

/**
 * Gets the initial offline state
 */
export function getInitialOfflineState(
  navigatorInstance: Navigator = typeof navigator !== 'undefined' ? navigator : ({} as Navigator)
): boolean {
  return typeof navigatorInstance.onLine !== 'undefined' ? !navigatorInstance.onLine : false
}

/**
 * Utility to check if a feature should be disabled when offline
 */
export function shouldDisableFeature(isOffline: boolean, featureRequiresNetwork: boolean): boolean {
  return isOffline && featureRequiresNetwork
}

/**
 * Gets the appropriate placeholder text based on offline status
 */
export function getOfflinePlaceholder(
  isOffline: boolean,
  onlinePlaceholder: string,
  offlinePlaceholder: string
): string {
  return isOffline ? offlinePlaceholder : onlinePlaceholder
}
