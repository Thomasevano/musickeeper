import { MusicItem } from '../../src/domain/music_item.js'
import { appFetch } from './app_update.svelte.js'
import type { ListManager } from './list_manager.svelte.js'

function isValidUrl(input: string) {
  try {
    const { protocol } = new URL(input)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

export class LinkPaste {
  url = $state('')
  inputError = $state('')
  open = $state(false)
  loading = $state(false)
  error = $state<string | null>(null)
  item = $state<MusicItem | null>(null)
  saving = $state(false)
  private sourceUrl = $state<string>()
  private controller: AbortController | null = null

  get hasUnsavedWork() {
    return !!(this.url || this.open || this.item || this.sourceUrl)
  }

  constructor(private list: ListManager) {}

  start = async () => {
    // Keep the trigger focusable while loading so closing the dialog restores focus.
    if (this.loading || !this.list.ready) return

    this.inputError = ''
    const url = this.url.trim()
    if (!url) {
      this.inputError = 'Please enter a URL'
      return
    }
    if (!isValidUrl(url)) {
      this.inputError = 'Please enter a valid URL'
      return
    }

    this.open = true
    await this.fetchMetadata()
  }

  fetchMetadata = async () => {
    this.controller?.abort()
    const controller = new AbortController()
    this.controller = controller
    this.loading = true
    this.error = null
    try {
      const response = await appFetch('/api/platform-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: this.url.trim() }),
        signal: controller.signal,
      })
      const data = await response.json()
      if (this.controller !== controller) return
      if (!response.ok) {
        this.error = data.error || 'Failed to fetch metadata'
        return
      }
      this.item = new MusicItem(data.musicItem)
      this.sourceUrl = data.linkMetadata.originalUrl
    } catch {
      if (this.controller === controller) {
        this.error = 'Failed to connect to server. Please check your internet connection.'
      }
    } finally {
      if (this.controller === controller) this.loading = false
    }
  }

  confirm = async (item: MusicItem, musicBrainzId?: string) => {
    if (this.saving || !this.item) return
    this.saving = true
    this.error = null
    try {
      await this.list.addFromPaste(item, musicBrainzId, this.sourceUrl, () => {
        this.resetDialog()
        this.url = ''
      })
    } catch (error) {
      console.error('Error saving item to listen later list:', error)
      this.error = 'Failed to save item. Please try again.'
    } finally {
      this.saving = false
    }
  }

  cancel = () => {
    if (!this.saving) this.resetDialog()
  }

  private resetDialog() {
    this.open = false
    this.controller?.abort()
    this.controller = null
    this.item = null
    this.sourceUrl = undefined
    this.error = null
    this.loading = false
  }
}
