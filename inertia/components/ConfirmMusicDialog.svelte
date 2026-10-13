<script lang="ts">
  import { tick, untrack } from 'svelte'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Select } from '$lib/components/ui/select/index.js'
  import { Badge } from '$lib/components/ui/badge/index.js'
  import Button from '~/lib/components/ui/button/button.svelte'
  import Input from '~/lib/components/ui/input/input.svelte'
  import CoverArt from '~/components/CoverArt.svelte'
  import { MusicItem, SearchType } from '../../src/domain/music_item'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  import { findDuplicate } from '../../src/infrastructure/storage/listen_later_storage'

  interface Props {
    open: boolean
    isLoading: boolean
    isSaving: boolean
    error: string | null
    musicItem: MusicItem | null
    listenLaterItems: ListenLaterItem[]
    onConfirm: (item: MusicItem, musicBrainzId?: string) => void
    onCancel: () => void
    onViewExisting: (item: ListenLaterItem) => void
    onRetry: () => void
  }
  let { open = $bindable(), isLoading, isSaving, error, musicItem, listenLaterItems,
    onConfirm, onCancel, onViewExisting, onRetry }: Props = $props()

  let editableTitle = $state('')
  let editableArtists = $state('')
  let editableAlbumName = $state('')
  let selectedType = $state<SearchType>(SearchType.track)
  let appliedDraftBaseline = $state<MusicItem | null>(null)
  let musicBrainzId = $state<string | undefined>()
  let candidates = $state<MusicItem[]>([])
  let selectedCandidate = $state<MusicItem | null>(null)
  let matchStatus = $state('')
  let isMatching = $state(false)
  let matchController: AbortController | null = null
  let matchButton = $state<HTMLButtonElement | null>(null)

  async function cancelMatchingAndFocus() {
    cancelMatching()
    await tick()
    matchButton?.focus()
  }

  function cancelMatching() {
    matchController?.abort()
    matchController = null
    isMatching = false
    candidates = []
    selectedCandidate = null
    matchStatus = ''
  }

  $effect(() => {
    const initial = musicItem
    const isOpen = open
    untrack(() => {
      cancelMatching()
      musicBrainzId = undefined
      appliedDraftBaseline = initial
      editableTitle = initial?.title ?? ''
      editableArtists = initial?.artists.join(', ') ?? ''
      editableAlbumName = initial?.albumName ?? ''
      selectedType = initial?.itemType ?? SearchType.track
    })
    if (!isOpen) return
    return cancelMatching
  })

  const artists = $derived(editableArtists.split(',').map((artist) => artist.trim()).filter(Boolean))
  const draft = $derived(appliedDraftBaseline ? new MusicItem({
    ...appliedDraftBaseline, title: editableTitle.trim(), artists,
    albumName: editableAlbumName.trim(), itemType: selectedType,
  }) : null)
  const duplicate = $derived(draft ? findDuplicate(listenLaterItems, draft.title, draft.artists) : null)
  const proposed = $derived(draft && selectedCandidate ? new MusicItem({
    ...draft,
    title: selectedCandidate.title,
    artists: selectedCandidate.artists,
    releaseDate: selectedCandidate.releaseDate || draft.releaseDate,
    length: selectedCandidate.length ?? draft.length,
    coverArt: musicItem?.coverArt || selectedCandidate.coverArt || draft.coverArt,
    albumName: musicItem?.albumName || selectedCandidate.albumName || draft.albumName,
  }) : null)
  const corrections = $derived(draft && proposed ? [
    ['Title', draft.title, proposed.title],
    ['Artists', draft.artists.join(', '), proposed.artists.join(', ')],
    ['Album', draft.albumName ?? '', proposed.albumName ?? ''],
    ['Release date', draft.releaseDate, proposed.releaseDate],
    ['Duration', draft.length ? `${draft.length / 1000} s` : '', proposed.length ? `${proposed.length / 1000} s` : ''],
    ['Artwork', draft.coverArt ?? '', proposed.coverArt ?? ''],
  ].filter(([, current, next]) => current !== next) : [])

  function identifyingEdit() {
    const currentArtists = new Set(artists.map((artist) => artist.toLowerCase()))
    const appliedArtists = new Set(appliedDraftBaseline?.artists.map((artist) => artist.toLowerCase()))
    if (draft?.title !== appliedDraftBaseline?.title || selectedType !== appliedDraftBaseline?.itemType ||
      currentArtists.size !== appliedArtists.size || [...currentArtists].some((artist) => !appliedArtists.has(artist))) {
      musicBrainzId = undefined
    }
    cancelMatching()
  }

  async function findMatches() {
    if (!draft || (!draft.title && !draft.artists.length)) return
    cancelMatching()
    const controller = new AbortController()
    matchController = controller
    isMatching = true
    matchStatus = 'Searching MusicBrainz…'
    const params = new URLSearchParams({ type: draft.itemType })
    if (draft.title) params.set('q', draft.title)
    if (draft.artists.length) params.set('artist', draft.artists.join(', '))
    try {
      const response = await fetch(`/library/listen-later?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error('Search failed')
      const result = await response.json()
      if (controller.signal.aborted || matchController !== controller) return
      candidates = result.serializedItems.filter((candidate: MusicItem) => candidate.itemType === selectedType)
      matchStatus = candidates.length ? 'Choose a candidate to review corrections.' : 'No MusicBrainz matches found. Your metadata is unchanged.'
    } catch {
      if (controller.signal.aborted || matchController !== controller) return
      matchStatus = 'MusicBrainz search failed. Your metadata is unchanged. You can retry or save without matching.'
    } finally {
      if (matchController === controller) isMatching = false
    }
  }

  function applyCorrections() {
    if (!proposed || !selectedCandidate) return
    musicBrainzId = selectedCandidate.id
    appliedDraftBaseline = proposed
    editableTitle = proposed.title
    editableArtists = proposed.artists.join(', ')
    editableAlbumName = proposed.albumName ?? ''
    cancelMatching()
    matchStatus = 'MusicBrainz corrections applied.'
    matchButton?.focus()
  }

  function save() {
    if (!draft || isSaving) return
    cancelMatching()
    onConfirm(draft, musicBrainzId)
  }
</script>

<Dialog.Root bind:open onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
  <Dialog.Content class="sm:max-w-xl max-h-[85dvh] overflow-y-auto" showCloseButton={!isSaving} escapeKeydownBehavior={isSaving ? 'ignore' : 'close'} interactOutsideBehavior={isSaving ? 'ignore' : 'close'}>
    <Dialog.Header>
      <Dialog.Title>{isLoading ? 'Processing Link' : error && !draft ? 'Error' : duplicate ? 'Duplicate Found' : 'Add to Listen Later'}</Dialog.Title>
      <Dialog.Description>Review platform metadata. MusicBrainz matching is optional.</Dialog.Description>
    </Dialog.Header>
    <p class="sr-only" role="status">{isLoading ? '' : duplicate ? 'Duplicate found. An item with the same title and the same artists is already in your list.' : draft ? 'Music information ready. Review before adding.' : ''}</p>
    {#if isLoading}
      <p role="status" aria-busy="true">Loading metadata...</p>
    {/if}
    {#if error}
      <div role="alert" class="rounded-md border border-destructive p-3 text-destructive">
        <p>{error}</p>
        {#if error.toLowerCase().includes('unsupported')}
          <p>Supported platforms: Spotify, YouTube, Apple Music, SoundCloud</p>
        {/if}
      </div>
    {/if}
    {#if draft && !isLoading}
      {#if duplicate}
        <div class="rounded-md border border-warning p-3 text-warning-foreground">
          <p>An item with the same title and the same artists is already in your list.</p>
          <p>Existing item in your list: {duplicate.title} — {duplicate.artists.join(', ')}</p>
        </div>
      {/if}
      <div class="flex items-center gap-4">
        <CoverArt src={draft?.coverArt} alt={draft ? 'Cover of ' + draft.title : ''} size="lg" />
        <Badge variant="outline">{musicBrainzId ? 'MusicBrainz Match' : 'From Link'}</Badge>
      </div>
      <fieldset disabled={isSaving} class="space-y-3">
        <div class="space-y-1"><label for="edit-title" class="text-sm font-medium">Title</label>
          <Input id="edit-title" bind:value={editableTitle} oninput={(event) => { editableTitle = event.currentTarget.value; identifyingEdit() }} placeholder="Title" /></div>
        <div class="space-y-1"><label for="edit-artists" class="text-sm font-medium">Artists</label>
          <Input id="edit-artists" bind:value={editableArtists} oninput={(event) => { editableArtists = event.currentTarget.value; identifyingEdit() }} placeholder="Artist(s), comma-separated" /></div>
        {#if selectedType !== SearchType.album}
          <div class="space-y-1"><label for="edit-album" class="text-sm font-medium">Album</label>
            <Input id="edit-album" bind:value={editableAlbumName} placeholder="Album name (optional)" /></div>
        {/if}
        <div class="flex items-center gap-4"><label for="item-type" class="text-sm font-medium">Item Type:</label>
          <Select id="item-type" bind:value={selectedType} onchange={(event) => { selectedType = event.currentTarget.value as SearchType; identifyingEdit() }} class="w-[140px]">
            <option value={SearchType.track}>Track</option><option value={SearchType.album}>Album</option>
          </Select></div>
        <div class="flex flex-wrap gap-2">
          <Button bind:ref={matchButton} variant="secondary" onclick={findMatches} disabled={isMatching || (!draft?.title && !artists.length)}>Find MusicBrainz matches</Button>
          {#if isMatching || candidates.length || selectedCandidate}
            <Button variant="outline" onclick={cancelMatchingAndFocus}>Cancel matching</Button>
          {/if}
        </div>
        <p role="status" aria-busy={isMatching} class="text-sm text-muted-foreground">{matchStatus}</p>
        {#if candidates.length}
          <ul aria-label="MusicBrainz candidates" class="space-y-2">
            {#each candidates as candidate (candidate.id)}
              <li><Button variant={selectedCandidate?.id === candidate.id ? 'secondary' : 'outline'} class="w-full h-auto min-h-11 justify-start whitespace-normal text-left" onclick={() => { selectedCandidate = candidate }} aria-pressed={selectedCandidate?.id === candidate.id}>
                {candidate.title} — {candidate.artists.join(', ')} · {candidate.releaseDate || 'Unknown date'}{candidate.albumName ? ` · ${candidate.albumName}` : ''}
              </Button></li>
            {/each}
          </ul>
        {/if}
        {#if proposed}
          <div class="space-y-2">
            <h3 class="font-medium">Review corrections</h3>
            <table aria-label="Proposed corrections" class="w-full text-sm table-fixed">
              <thead><tr><th class="text-left">Field</th><th class="text-left">Current</th><th class="text-left">After Apply</th></tr></thead>
              <tbody>{#each corrections as [label, current, next]}
                <tr><th class="text-left align-top">{label}</th><td class="break-words align-top">{current || 'Not available'}</td><td class="break-words align-top">{next || 'Not available'}</td></tr>
              {/each}</tbody>
            </table>
            {#if !corrections.length}<p>No metadata changes. Apply to associate this candidate.</p>{/if}
            <p class="text-sm text-muted-foreground">Source URL and item type stay unchanged. Platform artwork and album take precedence.</p>
            <Button onclick={applyCorrections}>Apply corrections</Button>
          </div>
        {/if}
      </fieldset>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={onCancel} disabled={isSaving}>Cancel</Button>
      {#if error && !draft}<Button onclick={onRetry}>Retry</Button>{/if}
      {#if duplicate}<Button variant="secondary" onclick={() => onViewExisting(duplicate)} disabled={isSaving}>View Existing</Button>{/if}
      {#if draft}<Button onclick={save} disabled={isSaving || !draft?.title} aria-busy={isSaving}>{isSaving ? 'Saving…' : duplicate ? 'Add Anyway' : 'Add to List'}</Button>{/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
