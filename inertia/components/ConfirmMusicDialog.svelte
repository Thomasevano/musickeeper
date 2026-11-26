<script lang="ts">
  import { tick, untrack } from 'svelte'
  import { SvelteSet } from 'svelte/reactivity'
  import * as Dialog from '$lib/components/ui/dialog/index.js'
  import { Select } from '$lib/components/ui/select/index.js'
  import Button from '~/lib/components/ui/button/button.svelte'
  import Input from '~/lib/components/ui/input/input.svelte'
  import CoverArt from '~/components/CoverArt.svelte'
  import { library } from '~/lib/listen_later.svelte'
  import { MusicItem, SearchType, findDuplicate } from '../../src/domain/music_item'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  import { appFetch } from '~/lib/app_update.svelte'

  interface Props {
    open: boolean
    isLoading: boolean
    isSaving: boolean
    error: string | null
    musicItem: MusicItem | null
    listenLaterItems: ListenLaterItem[]
    onConfirm: (item: MusicItem, musicBrainzId?: string) => void
    onCancel: () => void
    onViewExisting: (item: ListenLaterItem) => boolean
    onRetry: () => void
  }
  let { open = $bindable(), isLoading, isSaving, error, musicItem, listenLaterItems,
    onConfirm, onCancel, onViewExisting, onRetry }: Props = $props()

  let editableTitle = $state('')
  let editableArtists = $state<string[]>([''])
  let artistFields = $state<HTMLFieldSetElement>()
  let editableAlbumName = $state('')
  let selectedType = $state<SearchType>(SearchType.track)
  let appliedDraftBaseline = $state<MusicItem | null>(null)
  let musicBrainzId = $state<string | undefined>()
  let candidates = $state<MusicItem[]>([])
  let selectedCandidate = $state<MusicItem | null>(null)
  let useCandidateCover = $state(false)
  let matchStatus = $state('')
  let isMatching = $state(false)
  let matchController: AbortController | null = null
  let matchButton = $state<HTMLButtonElement | null>(null)
  let existingItemToView: ListenLaterItem | null = null
  let dialogElement = $state<HTMLDivElement | null>(null)
  const acknowledgedDuplicateIds = new SvelteSet<string>()

  function focusDialog() {
    dialogElement?.scrollTo({ top: 0 })
    dialogElement?.focus()
  }

  function editNewItem() {
    if (!duplicate || isSaving) return
    // Move focus before removing the button so the focus trap doesn't select a text field.
    focusDialog()
    acknowledgedDuplicateIds.add(duplicate.id)
  }

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
    useCandidateCover = false
    matchStatus = ''
  }

  $effect(() => {
    const initial = musicItem
    const isOpen = open
    untrack(() => {
      cancelMatching()
      musicBrainzId = undefined
      acknowledgedDuplicateIds.clear()
      appliedDraftBaseline = initial
      editableTitle = initial?.title ?? ''
      editableArtists = initial?.artists.length ? [...initial.artists] : ['']
      editableAlbumName = initial?.albumName ?? ''
      selectedType = initial?.itemType ?? SearchType.track
    })
    if (!isOpen) return
    return cancelMatching
  })

  const artists = $derived(editableArtists.map((artist) => artist.trim()).filter(Boolean))
  const draft = $derived(appliedDraftBaseline ? new MusicItem({
    ...appliedDraftBaseline, title: editableTitle.trim(), artists,
    albumName: editableAlbumName.trim(), itemType: selectedType,
  }) : null)
  const duplicate = $derived(draft ? findDuplicate(listenLaterItems, draft) : null)
  const showDuplicateWarning = $derived(!!duplicate && !acknowledgedDuplicateIds.has(duplicate.id))

  $effect.pre(() => {
    if (!open || !showDuplicateWarning) return
    const focused = document.activeElement
    if (focused && dialogElement?.contains(focused)) {
      void tick().then(() => {
        if (!focused.isConnected && open) focusDialog()
      })
    }
  })
  const proposed = $derived(draft && selectedCandidate ? new MusicItem({
    ...draft,
    title: selectedCandidate.title,
    artists: selectedCandidate.artists,
    releaseDate: selectedCandidate.releaseDate || draft.releaseDate,
    length: selectedCandidate.length ?? draft.length,
    coverArt: useCandidateCover ? selectedCandidate.coverArt : draft.coverArt || selectedCandidate.coverArt,
    albumName: musicItem?.albumName || selectedCandidate.albumName || draft.albumName,
  }) : null)
  const corrections = $derived(draft && proposed ? [
    ['Title', draft.title, proposed.title],
    ['Album', draft.albumName ?? '', proposed.albumName ?? ''],
    ['Release date', draft.releaseDate, proposed.releaseDate],
    ['Duration', draft.length ? `${draft.length / 1000} s` : '', proposed.length ? `${proposed.length / 1000} s` : ''],
  ].filter(([, current, next]) => current !== next) : [])
  const artistsChanged = $derived(draft && proposed && (
    draft.artists.length !== proposed.artists.length ||
    draft.artists.some((artist, index) => artist !== proposed?.artists[index])
  ))

  async function focusArtist(index: number) {
    await tick()
    artistFields?.querySelectorAll('input')[index]?.focus()
  }

  function addArtist() {
    editableArtists.push('')
    void focusArtist(editableArtists.length - 1)
  }

  function removeArtist(index: number) {
    editableArtists.splice(index, 1)
    identifyingEdit()
    void focusArtist(Math.min(index, editableArtists.length - 1))
  }

  function identifyingEdit() {
    const currentArtists = new Set(artists.map((artist) => artist.toLowerCase()))
    const appliedArtists = new Set(appliedDraftBaseline?.artists.map((artist) => artist.trim().toLowerCase()))
    if (draft?.title !== appliedDraftBaseline?.title || selectedType !== appliedDraftBaseline?.itemType ||
      currentArtists.size !== appliedArtists.size || [...currentArtists].some((artist) => !appliedArtists.has(artist))) {
      musicBrainzId = undefined
    }
    cancelMatching()
  }

  async function findMatches() {
    // Keep the busy button focusable without starting another search.
    if (isMatching || !draft || (!draft.title && !draft.artists.length)) return
    cancelMatching()
    const controller = new AbortController()
    matchController = controller
    isMatching = true
    matchStatus = 'Searching MusicBrainz…'
    const params = new URLSearchParams({ type: draft.itemType })
    if (draft.title) params.set('q', draft.title)
    for (const artist of draft.artists) params.append('artists[]', artist)
    try {
      const response = await appFetch(`/library/listen-later?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error('Search failed')
      const result = await response.json()
      if (controller.signal.aborted || matchController !== controller) return
      candidates = result.serializedItems.filter((candidate: MusicItem) => candidate.itemType === selectedType)
      matchStatus = candidates.length ? 'Choose a match to review.' : 'No MusicBrainz matches found. You can edit the details or save without a match.'
    } catch {
      if (controller.signal.aborted || matchController !== controller) return
      matchStatus = 'MusicBrainz search failed. Retry or save without a match.'
    } finally {
      if (matchController === controller) isMatching = false
    }
  }

  function applyCorrections() {
    const next = proposed
    if (!next || !selectedCandidate) return
    musicBrainzId = selectedCandidate.id
    appliedDraftBaseline = next
    editableTitle = next.title
    editableArtists = next.artists.length ? [...next.artists] : ['']
    editableAlbumName = next.albumName ?? ''
    cancelMatching()
    matchStatus = 'MusicBrainz corrections applied.'
    matchButton?.focus()
  }

  function save() {
    if (!draft || isSaving || library.access === 'outdated' || showDuplicateWarning) return
    cancelMatching()
    onConfirm(draft, musicBrainzId)
  }

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      onCancel()
    }
    open = isOpen
  }

  function viewExisting(item: ListenLaterItem) {
    existingItemToView = item
    onCancel()
  }

  function handleCloseAutoFocus(event: Event) {
    const item = existingItemToView
    existingItemToView = null
    if (item && onViewExisting(item)) event.preventDefault()
  }
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  <Dialog.Content
    bind:ref={dialogElement}
    class="music-confirmation min-w-0 max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain [overflow-wrap:anywhere] sm:max-w-xl [&>[data-dialog-close]]:flex [&>[data-dialog-close]]:size-11 [&>[data-dialog-close]]:items-center [&>[data-dialog-close]]:justify-center"
    style="translate: var(--confirmation-translate, -50% -50%)"
    showCloseButton={!isSaving}
    onCloseAutoFocus={handleCloseAutoFocus}
    escapeKeydownBehavior={isSaving ? 'ignore' : 'close'}
    interactOutsideBehavior={isSaving ? 'ignore' : 'close'}
  >
    <Dialog.Header class="min-w-0 pe-12 text-start">
      <Dialog.Title>{isLoading ? 'Processing Link' : error && !draft ? 'Error' : showDuplicateWarning ? 'Already in your list' : 'Add to Listen Later'}</Dialog.Title>
      {#if !showDuplicateWarning}
        <Dialog.Description>Check the title and artist before saving.</Dialog.Description>
      {/if}
    </Dialog.Header>
    <p class="sr-only" role="status">{isLoading || error ? '' : showDuplicateWarning ? `Duplicate found. Your list already contains ${duplicate?.itemType === SearchType.album ? 'an album' : 'a track'} with the same title and artists.` : draft ? 'Music information ready. Review before adding.' : ''}</p>
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
      {#if showDuplicateWarning && duplicate}
        <section aria-label="Existing saved item" class="space-y-3 rounded-lg border-2 border-warning bg-warning/10 p-4">
          <p class="text-sm font-semibold">You already saved this {duplicate.itemType === SearchType.album ? 'album' : 'track'}</p>
          <div class="flex min-w-0 items-start gap-3">
            <CoverArt src={duplicate?.coverArt} alt="" size="sm" class="shrink-0" />
            <div class="min-w-0 space-y-1">
              <p class="font-semibold">{duplicate.title}</p>
              <p class="text-sm">{duplicate.artists.join(', ') || 'Unknown artist'}</p>
              {#if duplicate.albumName}<p class="text-sm text-muted-foreground">{duplicate.albumName}</p>{/if}
              <p class="text-sm">{duplicate.hasBeenListened ? 'Listened' : 'Not listened'}</p>
            </div>
          </div>
        </section>
        <Dialog.Description>Keep the saved item, or review a second copy before adding it.</Dialog.Description>
        <div class="grid gap-2 sm:grid-cols-2 [&>button]:h-auto [&>button]:min-h-11 [&>button]:whitespace-normal">
          <Button onclick={() => viewExisting(duplicate)} disabled={isSaving}>Keep existing only</Button>
          <Button variant="outline" onclick={editNewItem} disabled={isSaving}>Continue with new item</Button>
        </div>
      {:else}
      <div class="flex min-w-0 items-center gap-4">
        <CoverArt src={draft?.coverArt} alt={'Cover of ' + (draft?.title ?? '')} size="sm" class="confirmation-cover shrink-0" />
        <div class="min-w-0">
          <p class="font-semibold">{draft.title}</p>
          <p class="text-sm text-muted-foreground">{draft.artists.join(', ')}</p>
          {#if musicBrainzId}<p class="mt-1 text-xs text-muted-foreground">MusicBrainz match</p>{/if}
        </div>
      </div>
      <fieldset disabled={isSaving} class="min-w-0 space-y-3 [&_button]:min-h-11">
        <div class="space-y-1"><label for="edit-title" class="text-sm font-medium">Title</label>
          <Input id="edit-title" bind:value={editableTitle} oninput={(event) => { editableTitle = event.currentTarget.value; identifyingEdit() }} placeholder="Title" /></div>
        <fieldset bind:this={artistFields} class="min-w-0 space-y-2">
          <legend class="sr-only">Artists</legend>
          {#each editableArtists as artist, index (index)}
            <div class="flex items-end gap-2">
              <div class="min-w-0 flex-1 space-y-1">
                <label for={`edit-artist-${index}`} class="text-sm font-medium">{editableArtists.length === 1 ? 'Artist' : `Artist ${index + 1}`}</label>
                <Input id={`edit-artist-${index}`} value={artist} oninput={(event) => { editableArtists[index] = event.currentTarget.value; identifyingEdit() }} />
              </div>
              {#if editableArtists.length > 1}
                <Button type="button" variant="ghost" aria-label={`Remove artist ${index + 1}`} onclick={() => removeArtist(index)}>Remove</Button>
              {/if}
            </div>
          {/each}
          <Button type="button" variant="outline" onclick={addArtist}>Add artist</Button>
        </fieldset>
        {#if selectedType !== SearchType.album}
          <div class="space-y-1"><label for="edit-album" class="text-sm font-medium">Album</label>
            <Input id="edit-album" bind:value={editableAlbumName} placeholder="Album name (optional)" /></div>
        {/if}
        {#if duplicate}
          <p class="flex items-center gap-4 text-sm">
            <span class="font-medium">Item Type:</span>
            {selectedType === SearchType.album ? 'Album' : 'Track'}
          </p>
        {:else}
          <div class="flex items-center gap-4"><label for="item-type" class="text-sm font-medium">Item Type:</label>
            <Select id="item-type" bind:value={selectedType} onchange={(event) => { selectedType = event.currentTarget.value as SearchType; identifyingEdit() }} class="min-h-11 w-[140px]">
              <option value={SearchType.track}>Track</option><option value={SearchType.album}>Album</option>
            </Select></div>
        {/if}
        <section aria-labelledby="matching-heading" class="space-y-3 border-t pt-4">
          <div class="space-y-1">
            <h3 id="matching-heading" class="font-semibold">Match with MusicBrainz <span class="text-sm font-normal text-muted-foreground">(optional)</span></h3>
            <p class="text-sm text-muted-foreground">Review a match before applying its details.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              bind:ref={matchButton}
              variant="secondary"
              class="aria-disabled:opacity-50"
              onclick={findMatches}
              disabled={!draft?.title && !artists.length}
              aria-disabled={isMatching || undefined}
              aria-busy={isMatching}
            >Find MusicBrainz matches</Button>
            {#if isMatching || candidates.length || selectedCandidate}
              <Button variant="outline" onclick={cancelMatchingAndFocus}>Cancel matching</Button>
            {/if}
          </div>
          <p role="status" aria-busy={isMatching} class="text-sm text-muted-foreground">{matchStatus}</p>
          {#if candidates.length}
            <ul aria-label="MusicBrainz candidates" class="max-h-64 divide-y overflow-y-auto overscroll-contain border-y">
              {#each candidates as candidate (candidate.id)}
                <li>
                  <Button variant="ghost" class={['h-auto min-h-11 w-full justify-start gap-3 whitespace-normal rounded-none border-l-2 p-3 text-left focus-visible:ring-inset md:h-auto', selectedCandidate?.id === candidate.id ? 'border-primary bg-muted' : 'border-transparent'].join(' ')} onclick={() => { selectedCandidate = candidate; useCandidateCover = false }} aria-pressed={selectedCandidate?.id === candidate.id}>
                    <CoverArt src={candidate.coverArt} alt="" size="sm" class="shrink-0" />
                    <span class="min-w-0 flex-1 space-y-1">
                      <span class="block font-semibold">{candidate.title}</span>
                      <span class="block text-sm">{candidate.artists.join(', ') || 'Unknown artist'}</span>
                      <span class="block text-xs text-muted-foreground">{candidate.albumName || 'Unknown album'} · {candidate.releaseDate || 'Unknown date'}</span>
                      <span class="block min-h-4 text-xs font-medium">{selectedCandidate?.id === candidate.id ? 'Selected for review' : ''}</span>
                    </span>
                  </Button>
                </li>
              {/each}
            </ul>
          {/if}
          {#if proposed}
            <section aria-label="Proposed corrections" class="space-y-4 border-t pt-4">
              <h4 class="font-semibold">Review changes</h4>
              {#if corrections.length || artistsChanged}
                <dl class="divide-y">
                  {#if artistsChanged}
                    <div class="py-3 first:pt-0 last:pb-0">
                      <dt class="mb-2 text-sm font-semibold">Artists</dt>
                      <dd class="grid min-w-0 gap-3 sm:grid-cols-2">
                        {#each [draft.artists, proposed.artists] as credits, index}
                          <div>
                            <span class="mb-1 block text-xs text-muted-foreground">{index === 0 ? 'Current' : 'After applying'}</span>
                            {#if credits.length}
                              <ul class="text-sm">{#each credits as credit}<li>{credit}</li>{/each}</ul>
                            {:else}
                              <span class="text-sm">Not available</span>
                            {/if}
                          </div>
                        {/each}
                      </dd>
                    </div>
                  {/if}
                  {#each corrections as [label, current, next]}
                    <div class="py-3 first:pt-0 last:pb-0">
                      <dt class="mb-2 text-sm font-semibold">{label}</dt>
                      <dd class="grid min-w-0 gap-3 sm:grid-cols-2">
                        <div><span class="mb-1 block text-xs text-muted-foreground">Current</span><span class="text-sm">{current || 'Not available'}</span></div>
                        <div><span class="mb-1 block text-xs font-medium text-muted-foreground">After applying</span><span class="text-sm font-medium">{next || 'Not available'}</span></div>
                      </dd>
                    </div>
                  {/each}
                </dl>
              {:else}
                <p class="text-sm">The details match. Apply to link this item to MusicBrainz.</p>
              {/if}
              {#if selectedCandidate?.coverArt && selectedCandidate.coverArt !== draft.coverArt}
                <fieldset class="space-y-2">
                  <legend class="mb-2 text-sm font-semibold">Cover artwork</legend>
                  <div class="grid grid-cols-2 gap-3">
                    {#if draft.coverArt}
                      <label class="flex min-w-0 cursor-pointer flex-col gap-2 rounded-md border bg-background p-3">
                        <CoverArt src={draft?.coverArt} alt="Current cover" size="sm" />
                        <span class="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="match-cover" checked={!useCandidateCover} onchange={() => { useCandidateCover = false }} />Keep current cover</span>
                      </label>
                    {/if}
                    <label class="flex min-w-0 cursor-pointer flex-col gap-2 rounded-md border bg-background p-3">
                      <CoverArt src={selectedCandidate?.coverArt} alt="MusicBrainz cover" size="sm" />
                      <span class="flex min-h-11 items-center gap-2 text-sm"><input type="radio" name="match-cover" checked={useCandidateCover || !draft.coverArt} onchange={() => { useCandidateCover = true }} />Use MusicBrainz cover</span>
                    </label>
                  </div>
                </fieldset>
              {/if}
              <p class="text-xs text-muted-foreground">Keeps your source link and item type. Uses the original platform album when available.</p>
              <Button onclick={applyCorrections}>Apply corrections</Button>
            </section>
          {/if}
        </section>
      </fieldset>
      {/if}
    {/if}
    {#if library.access === 'outdated'}
      <p role="alert" class="text-sm">This tab can no longer save to your list. Copy any edits you want to keep, then close this dialog and reload.</p>
    {/if}
    <Dialog.Footer class="flex-wrap border-t pt-4 [&>button]:min-h-11 [&>button]:min-w-11">
      <Button variant={showDuplicateWarning ? 'ghost' : 'outline'} onclick={onCancel} disabled={isSaving}>Cancel</Button>
      {#if error && !draft}<Button onclick={onRetry}>Retry</Button>{/if}
      {#if duplicate && !showDuplicateWarning}<Button variant="secondary" onclick={() => viewExisting(duplicate)} disabled={isSaving}>View Existing</Button>{/if}
      {#if draft && !showDuplicateWarning}
        <Button variant={duplicate ? 'outline' : 'default'} onclick={save} disabled={library.access === 'outdated' || isSaving || !draft.title} aria-busy={isSaving}>{isSaving ? 'Saving…' : duplicate ? 'Add Anyway' : 'Add to List'}</Button>
      {/if}
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<style>
  @media (width < 40rem) {
    /* One native scroll area keeps fields and actions reachable on short screens. */
    :global(.music-confirmation) {
      --confirmation-translate: 0 0;
      inset-inline-start: 0;
      top: auto;
      bottom: 0;
      max-width: none;
      max-height: calc(100dvh - max(1rem, env(safe-area-inset-top, 0px)));
      border-radius: 1rem 1rem 0 0;
      padding: 1rem;
      padding-inline-start: calc(1rem + env(safe-area-inset-left, 0px));
      padding-inline-end: calc(1rem + env(safe-area-inset-right, 0px));
      padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
    }

    :global(.music-confirmation [data-dialog-close]) {
      inset-inline-end: calc(1rem + env(safe-area-inset-right, 0px));
    }

    /* Size both the image and its loading placeholder, not just their wrapper. */
    :global(.music-confirmation .confirmation-cover),
    :global(.music-confirmation .confirmation-cover > *) {
      width: 5rem;
      height: 5rem;
    }
  }

  /* Landscape phones still need readable inputs without Safari focus zoom. */
  @media (pointer: coarse) {
    :global(.music-confirmation input),
    :global(.music-confirmation select) {
      font-size: 1rem;
    }
  }
</style>
