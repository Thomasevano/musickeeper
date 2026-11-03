type QualifyingAction =
  | 'item_saved'
  | 'item_removed'
  | 'marked_listened'
  | 'marked_unlistened'
  | 'open_external_link'

type ActivityEvent = [event: string, options: { props: { action: QualifyingAction } }]

declare global {
  interface Window {
    plausible?: ((...args: ActivityEvent) => void) & { q?: ActivityEvent[] }
  }
}

function canTrack(): boolean {
  return (
    window.location.origin === 'https://musickeeper.app' &&
    !navigator.webdriver &&
    window.localStorage.getItem('plausible_ignore') !== 'true'
  )
}

export function initializeAnalytics(): void {
  try {
    if (!import.meta.env.PROD || !canTrack()) return
    if (!window.plausible) {
      const queue: ActivityEvent[] = []
      window.plausible = Object.assign(
        (...args: ActivityEvent) => {
          queue.push(args)
        },
        { q: queue }
      )
    }
    const script = document.createElement('script')
    script.defer = true
    script.dataset.domain = 'musickeeper.app'
    script.src = 'https://analytics.thomasevano.fr/js/script.js'
    document.head.append(script)
  } catch {
    // Unavailable browser storage must not defeat the owner's exclusion or app startup.
  }
}

export function trackQualifyingActivity(action: QualifyingAction): void {
  try {
    if (canTrack()) window.plausible?.('active_use', { props: { action } })
  } catch {
    // Analytics is best-effort: never change an action's outcome or persist a replay.
  }
}
