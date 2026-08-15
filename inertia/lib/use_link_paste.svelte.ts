import { MusicItem, SearchType, type ListenLaterItem } from '../../src/domain/music_item'
import type { LinkMetadata } from '../../src/domain/link'
import type { ListManager } from './list_manager.svelte'

export interface LinkPasteState {
  // Input
  readonly linkUrl: string
  readonly linkError: string
  readonly isProcessingLink: boolean

  // Dialog
  isConfirmDialogOpen: boolean
  readonly isDialogLoading: boolean
  readonly dialogError: string | null
  readonly pendingMusicItem: MusicItem | null
  readonly pendingLinkMetadata: LinkMetadata | null
  readonly pendingSource: 'musicbrainz' | 'link' | null
  readonly existingDuplicate: ListenLaterItem | null

  // Actions
  setLinkUrl(value: string): void
  handlePasteLink(): Promise<void>
  handleRetry(): void
  handleConfirm(
    itemType: SearchType,
    title: string,
    artists: string[],
    albumName: string
  ): Promise<void>
  handleCancel(): void
  handleViewExisting(): string | null
}

export function createLinkPaste(list: ListManager): LinkPasteState {
  let linkUrl = $state('')
  let linkError = $state('')
  let isProcessingLink = $state(false)

  let isConfirmDialogOpen = $state(false)
  let isDialogLoading = $state(false)
  let dialogError = $state<string | null>(null)
  let pendingMusicItem = $state<MusicItem | null>(null)
  let pendingLinkMetadata = $state<LinkMetadata | null>(null)
  let pendingSource = $state<'musicbrainz' | 'link' | null>(null)
  let existingDuplicate = $state<ListenLaterItem | null>(null)

  function resetPendingState() {
    pendingMusicItem = null
    pendingLinkMetadata = null
    pendingSource = null
    existingDuplicate = null
    dialogError = null
    isDialogLoading = false
  }

  function isValidUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  async function fetchLinkMetadata() {
    isDialogLoading = true
    dialogError = null
    isProcessingLink = true

    try {
      const response = await fetch('/api/link/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl }),
      })

      const data = await response.json()

      if (!response.ok) {
        dialogError = data.error || 'Failed to fetch metadata'
        return
      }

      const title = data.musicItem?.title || data.linkMetadata?.title || ''
      const artists =
        data.musicItem?.artists || (data.linkMetadata?.artist ? [data.linkMetadata.artist] : [])
      const duplicate = list.findDuplicate(title, artists)

      pendingMusicItem = data.musicItem
      pendingLinkMetadata = data.linkMetadata
      pendingSource = data.source
      existingDuplicate = duplicate
    } catch (error) {
      dialogError = 'Failed to connect to server. Please check your internet connection.'
      console.error('Error fetching link metadata:', error)
    } finally {
      isDialogLoading = false
      isProcessingLink = false
    }
  }

  return {
    get linkUrl() {
      return linkUrl
    },
    get linkError() {
      return linkError
    },
    get isProcessingLink() {
      return isProcessingLink
    },
    get isConfirmDialogOpen() {
      return isConfirmDialogOpen
    },
    set isConfirmDialogOpen(value: boolean) {
      isConfirmDialogOpen = value
      if (!value) resetPendingState()
    },
    get isDialogLoading() {
      return isDialogLoading
    },
    get dialogError() {
      return dialogError
    },
    get pendingMusicItem() {
      return pendingMusicItem
    },
    get pendingLinkMetadata() {
      return pendingLinkMetadata
    },
    get pendingSource() {
      return pendingSource
    },
    get existingDuplicate() {
      return existingDuplicate
    },

    setLinkUrl(value: string) {
      linkUrl = value
    },

    async handlePasteLink() {
      if (isProcessingLink) return

      linkError = ''

      if (!linkUrl.trim()) {
        linkError = 'Please enter a URL'
        return
      }

      if (!isValidUrl(linkUrl)) {
        linkError = 'Please enter a valid URL'
        return
      }

      isProcessingLink = true
      isDialogLoading = true
      dialogError = null
      isConfirmDialogOpen = true

      await fetchLinkMetadata()
    },

    handleRetry() {
      fetchLinkMetadata()
    },

    async handleConfirm(
      itemType: SearchType,
      title: string,
      artists: string[],
      albumName: string
    ) {
      if (!pendingMusicItem) return

      const stored = await list.add(
        {
          id: pendingMusicItem.id,
          title,
          releaseDate: pendingMusicItem.releaseDate,
          length: pendingMusicItem.length,
          artists,
          albumName,
          itemType,
          coverArt: pendingMusicItem.coverArt,
        },
        linkUrl || undefined
      )

      if (stored) {
        isConfirmDialogOpen = false
        resetPendingState()
        linkUrl = ''
      } else {
        dialogError = 'Failed to save item. Please try again.'
      }
    },

    handleCancel() {
      isConfirmDialogOpen = false
      resetPendingState()
    },

    /** Returns the duplicate item ID for scrolling, or null. */
    handleViewExisting(): string | null {
      if (!existingDuplicate) return null
      const id = existingDuplicate.id
      isConfirmDialogOpen = false
      resetPendingState()
      return id
    },
  }
}
