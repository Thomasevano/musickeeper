<script lang="ts">
  import { tick, untrack } from 'svelte'
  import type { NewListenLaterItem } from '../../../src/infrastructure/storage/listen_later_storage'
  import { normalizeSearchResults } from '../../lib/qobuz_search'

  type Category = 'all' | 'albums' | 'tracks' | 'artists' | 'playlists'
  type Kind = 'album' | 'track'
  let { query, category, artistOnly, returnHref, savedIds, busyIds, ready, onSave, onArtistOnlyChange }: {
    query: string; category: Category; artistOnly: boolean; returnHref: string
    savedIds: ReadonlySet<string>; busyIds: readonly string[]; ready: boolean
    onSave: (item: NewListenLaterItem) => Promise<boolean>
    onArtistOnlyChange: (enabled: boolean) => void
  } = $props()

  let albums = $state<NewListenLaterItem[]>([])
  let tracks = $state<NewListenLaterItem[]>([])
  let errors = $state<Partial<Record<Kind, string>>>({})
  let loading = $state(false)
  let retry = $state(0)
  let generation = 0
  let lastStart = 0
  let lastKey = ''
  let lastRetry = 0
  let menu = $state<{ item: NewListenLaterItem; x: number; y: number; token: number; anchor: { top: number; left: number } } | null>(null)
  let menuNode = $state<HTMLDivElement | null>(null)
  let trigger: HTMLButtonElement | null = null
  let saving = $state<string[]>([])
  let menuToken = 0

  function href(next: Category) {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (artistOnly) params.set('field', 'artist')
    if (returnHref) params.set('from', returnHref)
    return `/qobuz/search/${next}${params.size ? `?${params}` : ''}`
  }
  function duration(ms?: number) {
    if (ms === undefined) return '—'
    const seconds = Math.floor(ms / 1000)
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  }
  function pause(ms: number, signal: AbortSignal) {
    const { promise, resolve, reject } = Promise.withResolvers<void>()
    if (signal.aborted) { reject(new DOMException('Aborted', 'AbortError')); return promise }
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, ms)
    function abort() { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')) }
    signal.addEventListener('abort', abort, { once: true })
    return promise
  }
  $effect(() => {
    const term = query.trim(), selected = category, artist = artistOnly
    const key = JSON.stringify([term, selected, artist])
    const isRetry = key === lastKey && retry !== lastRetry
    const failed = untrack(() => Object.keys(errors) as Kind[])
    lastKey = key
    lastRetry = retry
    const current = ++generation
    const controller = new AbortController()
    if (!isRetry) { albums = []; tracks = [] }
    errors = {}; menu = null
    if (term.length < 3 || selected === 'playlists') { loading = false; return () => controller.abort() }
    loading = true
    const kinds: Kind[] = isRetry ? failed : selected === 'albums' ? ['album'] : selected === 'tracks' ? ['track'] : ['album', 'track']
    void (async () => {
      for (const kind of kinds) {
        try {
          await pause(Math.max(0, 1000 - (Date.now() - lastStart)), controller.signal)
          if (controller.signal.aborted) return
          lastStart = Date.now()
          const request = new AbortController()
          const abort = () => request.abort()
          controller.signal.addEventListener('abort', abort, { once: true })
          let timedOut = false
          const timer = setTimeout(() => { timedOut = true; request.abort() }, 12000)
          try {
            const params = new URLSearchParams({ type: kind, [artist ? 'artist' : 'q']: term })
            const response = await fetch(`/library/listen-later?${params}`, { signal: request.signal, headers: { Accept: 'application/json' } })
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`)
            if (!response.headers.get('content-type')?.toLowerCase().includes('application/json')) throw new Error('Réponse non JSON')
            const data: unknown = await response.json()
            if (!data || typeof data !== 'object' || !Array.isArray((data as { serializedItems?: unknown }).serializedItems)) throw new Error('Réponse invalide')
            if (current === generation && !controller.signal.aborted) {
              const items = normalizeSearchResults(data, kind)
              if (kind === 'album') albums = items; else tracks = items
            }
          } catch (error) {
            if (controller.signal.aborted) return
            const message = timedOut ? 'Délai de recherche dépassé' : error instanceof Error ? error.message : 'Erreur réseau'
            if (current === generation) errors = { ...errors, [kind]: message }
          } finally {
            clearTimeout(timer)
            controller.signal.removeEventListener('abort', abort)
          }
        } catch { return }
      }
      if (current === generation && !controller.signal.aborted) loading = false
    })()
    return () => { controller.abort() }
  })
  const artists = $derived([...new Set([...albums, ...tracks].flatMap(item => item.artists).filter(Boolean))].slice(0, 10))
  const first = $derived(albums[0] ?? tracks[0])
  function disabled(item: NewListenLaterItem) { return !ready || savedIds.has(item.id) || busyIds.includes(item.id) || saving.includes(item.id) }
  function closeMenu(restore = false) { menu = null; if (restore) void tick().then(() => trigger?.focus()) }
  async function openMenu(event: MouseEvent, item: NewListenLaterItem) {
    const button = event.currentTarget as HTMLButtonElement
    if (menu?.item.id === item.id) { closeMenu(true); return }
    trigger = button
    const box = button.getBoundingClientRect()
    const token = ++menuToken
    menu = { item, x: Math.max(8, Math.min(box.left, window.innerWidth - 260)), y: box.bottom, token, anchor: { top: box.top, left: box.left } }
    await tick()
    if (menu?.token !== token || !menuNode) return
    const rect = menuNode.getBoundingClientRect()
    menu = { ...menu, x: Math.max(8, Math.min(box.left, window.innerWidth - rect.width - 8)), y: Math.max(8, Math.min(box.bottom, window.innerHeight - rect.height - 8)) }
    await tick()
    if (menu?.token !== token || !menuNode) return
    menuNode.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)')?.focus({ preventScroll: true })
  }
  async function save(item: NewListenLaterItem) {
    if (disabled(item)) return
    const token = menu?.token
    saving = [...saving, item.id]
    try {
      const saved = await onSave(item)
      if (saved && token !== undefined && menu?.token === token) closeMenu(true)
    } catch { /* Parent owns announcements. */ }
    finally { saving = saving.filter(id => id !== item.id) }
  }
  function menuKey(event: KeyboardEvent) {
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(true); return }
    if (event.key === 'Tab') { closeMenu(); return }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const buttons = [...(menuNode?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [])]
    if (!buttons.length) return
    event.preventDefault()
    const index = buttons.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : buttons.length - 1)) % buttons.length
    buttons[next].focus()
  }
  $effect(() => {
    const dismiss = () => {
      if (!menu || !trigger) return
      if (!trigger.isConnected) { closeMenu(); return }
      const box = trigger.getBoundingClientRect()
      if (Math.abs(box.top - menu.anchor.top) > 0.5 || Math.abs(box.left - menu.anchor.left) > 0.5) closeMenu()
    }
    window.addEventListener('scroll', dismiss, true)
    return () => window.removeEventListener('scroll', dismiss, true)
  })
</script>

<svelte:window onresize={() => closeMenu()} onclick={() => closeMenu()} />

{#snippet icon(name: string)}<svg aria-hidden="true" class="icon"><use href={`/qobuz-concept/icons.svg#qobuz-icon-${name}`} /></svg>{/snippet}
{#snippet artwork(item: NewListenLaterItem)}
  <div class="artwork">
    {#if item.coverArt}<img src={item.coverArt} alt="" onerror={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none' }} />{/if}
    <span class="fallback">{@render icon(item.itemType === 'album' ? 'album' : 'track')}</span>
  </div>
{/snippet}
{#snippet actions(item: NewListenLaterItem)}
  <button class="icon-button" aria-label={`Écouter plus tard : ${item.title}`} disabled={disabled(item)} onclick={() => save(item)}>{@render icon('time')}</button>
  <button class="icon-button" aria-label={`Plus d’options : ${item.title}`} aria-haspopup="menu" aria-expanded={menu?.item.id === item.id} onclick={(event) => { event.stopPropagation(); void openMenu(event, item) }}>{@render icon('more')}</button>
{/snippet}
{#snippet albumCard(item: NewListenLaterItem)}
  <article class="album-card" aria-label={`${item.title} par ${item.artists.join(', ') || 'artiste inconnu'}`}><div class="cover-wrap">{@render artwork(item)}<div class="actions">{@render actions(item)}</div></div><div class="card-title">{item.title}</div><div class="muted">{item.artists.join(', ') || 'Artiste inconnu'}</div></article>
{/snippet}
{#snippet trackRow(item: NewListenLaterItem)}
  <article class="track-row" class:full-track={category === 'tracks'} aria-label={`${item.title} par ${item.artists.join(', ') || 'artiste inconnu'}`}>
    <div class="track-title">{@render artwork(item)}<div class="track-name"><strong>{item.title}</strong><span class="muted">{item.artists.join(', ') || 'Artiste inconnu'}</span></div></div>
    {#if category === 'tracks'}
      <span class="release muted" title={item.albumName || 'Non fourni par MusicBrainz'}>{item.albumName || '—'}</span>
      <span class="genre muted" title="Non fourni par MusicBrainz">—</span>
      <span class="label muted" title="Non fourni par MusicBrainz">—</span>
    {/if}
    <span class="duration muted">{duration(item.length)}</span><div class="track-actions">{@render actions(item)}</div>
  </article>
{/snippet}
{#snippet albumPlaceholder()}
  <div class="album-placeholder" aria-hidden="true"><div class="artwork"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
{/snippet}
{#snippet trackPlaceholder()}
  <div class="track-placeholder" aria-hidden="true"><div class="placeholder-cover"></div><div class="skeleton-line"></div></div>
{/snippet}
{#snippet artistCards(names: string[], pending: boolean)}
  <div class="artists">
    {#each names as name}<div><div class="artist-circle">{@render icon('artist')}</div><span class="artist-name" title={name}>{name}</span></div>{/each}
    {#if pending && !names.length}{#each [1,2,3,4,5] as placeholder (placeholder)}<div aria-hidden="true"><div class="artist-circle"></div><div class="skeleton-line"></div></div>{/each}{/if}
  </div>
{/snippet}

<div class="qobuz-search">
  {#if category === 'all'}
    <div class="overview-close"><a href={returnHref} aria-label="Fermer la recherche">{@render icon('close')}</a></div>
    <div class="refinements">
      <div><div class="refinement-title">Ajouter des tags à votre recherche :</div><div class="refinement-controls"><button disabled title="Filtre non disponible avec MusicBrainz">+ Hi-Res</button><button disabled title="Filtre non disponible avec MusicBrainz">+ Nouveauté</button><button disabled title="Filtre non disponible avec MusicBrainz">+ Stricte</button></div></div>
      <div><div class="refinement-title">Rechercher dans :</div><div class="refinement-controls"><label><input type="checkbox" checked={artistOnly} onchange={(event) => onArtistOnlyChange(event.currentTarget.checked)} /> Artiste Principal</label>{#each ['Compositeur', 'Interprète', 'Nom / Titre', 'Label'] as scope}<label title="Ce champ n’est pas pris en charge par cette recherche MusicBrainz"><input type="checkbox" disabled /> {scope}</label>{/each}</div></div>
    </div>
  {:else}
    <div class="heading"><h1>Résultats pour <span>{query}</span></h1><a href={returnHref} aria-label="Fermer la recherche">{@render icon('close')}</a></div>
  {/if}
  <p class="source">Résultats MusicBrainz · Jusqu’à 10 résultats par catégorie.</p>
  {#if category === 'playlists'}
    <p>MusicBrainz ne propose pas de recherche de playlists. Retrouvez vos playlists enregistrées dans votre liste à écouter plus tard.</p><a href="/library/listen-later">Voir ma liste</a>
  {:else if query.trim().length < 3}
    <p role="status">Saisissez au moins 3 caractères pour lancer la recherche.</p>
  {:else}
    <span class="loading-status" role="status">{loading ? 'Recherche en cours…' : ''}</span>
    {#if Object.keys(errors).length}<div role="alert">{#each Object.entries(errors) as [kind, error]}<p>{kind === 'album' ? 'Albums' : 'Titres'} : {error}</p>{/each}<button onclick={() => retry++}>Réessayer</button></div>{/if}
    {#if !loading && !albums.length && !tracks.length && !Object.keys(errors).length}<p role="status">Aucun résultat.</p>{/if}
    {#if category === 'all'}
      <div class="top-results">
        <section><h2>Premier résultat <small>(MusicBrainz)</small></h2>
          {#if first}<div class="best">{@render artwork(first)}<div><strong>{first.title}</strong><p class="muted">{first.artists.join(', ')}</p>{@render actions(first)}</div></div>
          {:else if loading}<div class="best" aria-hidden="true"><div class="artwork"></div><div class="skeleton-line"></div></div>
          {:else}<p>Aucun résultat.</p>{/if}
        </section>
        <section><div class="section-heading"><h2>Artistes</h2><a href={href('artists')}>Voir tous les artistes</a></div>{@render artistCards(artists.slice(0, 5), loading)}<p class="muted">Artistes crédités dans ces résultats, pas une recherche d’artistes indépendante.</p></section>
      </div>
      <div class="columns">
        <section><div class="section-heading"><h2>Albums</h2><a href={href('albums')}>Voir tous les albums</a></div>
          <div class="album-grid overview">{#each albums.slice(0, 3) as item (item.id)}{@render albumCard(item)}{/each}{#if loading && !albums.length}{#each [1,2,3] as placeholder (placeholder)}{@render albumPlaceholder()}{/each}{/if}</div>
        </section>
        <section><div class="section-heading"><h2>Titres</h2><a href={href('tracks')}>Voir tous les titres</a></div>
          {#each tracks.slice(0, 5) as item (item.id)}{@render trackRow(item)}{/each}
          {#if loading && !tracks.length}{#each [1,2,3,4,5] as placeholder (placeholder)}{@render trackPlaceholder()}{/each}{/if}
        </section>
      </div>
      <section><div class="section-heading"><h2>Playlists</h2><a href={href('playlists')}>Voir les playlists</a></div><p>La recherche de playlists n’est pas disponible avec MusicBrainz.</p></section>
    {:else if category === 'albums'}<div class="album-grid">{#each albums as item (item.id)}{@render albumCard(item)}{/each}{#if loading && !albums.length}{#each [1,2,3,4,5] as placeholder (placeholder)}{@render albumPlaceholder()}{/each}{/if}</div>
    {:else if category === 'tracks'}
      <p class="muted availability">Genre et label non fournis par MusicBrainz.</p>
      <div class="track-head"><span class="title-heading">Titre</span><span class="release">Release</span><span class="genre">Genre</span><span class="label">Label</span><span class="duration">Durée</span><span aria-hidden="true"></span></div>
      <div>{#each tracks as item (item.id)}{@render trackRow(item)}{/each}{#if loading && !tracks.length}{#each [1,2,3,4,5] as placeholder (placeholder)}{@render trackPlaceholder()}{/each}{/if}</div>
    {:else if category === 'artists'}<p>Artistes crédités dans les résultats d’albums et de titres ; il ne s’agit pas d’une recherche d’artistes indépendante.</p>{@render artistCards(artists, loading)}{/if}
  {/if}
</div>
{#if menu}
  <div class="context-menu" role="menu" tabindex="-1" bind:this={menuNode} style:left={`${menu.x}px`} style:top={`${menu.y}px`} onkeydown={menuKey} onclick={(event) => event.stopPropagation()}>
    <button role="menuitem" disabled={disabled(menu.item)} onclick={() => save(menu!.item)}>{savedIds.has(menu.item.id) ? 'Déjà dans écouter plus tard' : 'Ajouter à écouter plus tard'}</button>
    <button role="menuitem" disabled title="Lecture non disponible">Lire</button><button role="menuitem" disabled title="Favoris non disponibles">Ajouter aux favoris</button>
    {#if menu.item.sourceUrl}<a role="menuitem" href={menu.item.sourceUrl} target="_blank" rel="noopener noreferrer">Voir sur MusicBrainz</a>{/if}
  </div>
{/if}

<style>
  .qobuz-search { position: relative; color: #fff; padding: 24px 20px 40px; }
  .icon { width: 20px; height: 20px; fill: currentColor; }
  button, a { font: inherit; }
  a { color: #2a9dd6; text-decoration: none; }
  a:hover { text-decoration: underline; }
  button { cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .5; }
  button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid #2a9dd6; outline-offset: 2px; }
  h1, h2 { font-size: 22px; font-weight: 700; line-height: 29px; }
  h1 span { color: #2a9dd6; }
  small, .source, .muted { color: #aaa; font-size: 13px; }
  .source { margin: 16px 0; line-height: 20px; }
  .overview-close { position: absolute; top: 16px; right: 20px; }
  .overview-close a, .heading a { display: grid; place-items: center; width: 44px; height: 44px; color: inherit; }
  .refinements { display: grid; grid-template-columns: 1fr 2fr; gap: 20px; padding: 0 0 12px; border-bottom: 1px solid #333; font-size: 16px; }
  .refinement-title { font-size: 18px; font-weight: 700; line-height: 24px; margin-bottom: 10px; }
  .refinement-controls { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
  .refinement-controls button { height: 32px; font-size: 14px; line-height: 18px; border: 1px solid #333; border-radius: 3px; color: #fff; background: #242424; padding: 6px 7px; }
  .refinement-controls label { display: flex; align-items: center; gap: 6px; }
  .refinement-controls label:has(input:not(:disabled)) { min-height: 44px; margin-block: -6px; padding-inline: 4px; }
  .refinement-controls input { appearance: none; position: relative; width: 18px; height: 18px; border: 0; border-radius: 50%; background: #8b8b8b; flex: none; }
  .refinement-controls input:checked { background: #2a9dd6; }
  .refinement-controls input:checked::after { content: ''; position: absolute; left: 6px; top: 3px; width: 5px; height: 9px; border: solid #fff; border-width: 0 2px 2px 0; transform: rotate(45deg); }
  .section-heading a { display: inline-flex; align-items: center; min-height: 44px; margin-block: -7.5px; }
  .qobuz-search button:not(:disabled), .qobuz-search > a { min-height: 44px; min-width: 44px; }
  .qobuz-search > a { display: inline-flex; align-items: center; }
  .refinement-controls label:has(input:disabled) { color: #aaa; }
  .heading, .section-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  section { min-width: 0; margin-bottom: 32px; }
  .top-results, .columns { display: grid; }
  .top-results { grid-template-columns: 1fr 2fr; gap: 20px; padding-bottom: 24px; border-bottom: 1px solid #333; margin-bottom: 30px; }
  .top-results > section { margin-bottom: 0; }
  .top-results > section > h2, .top-results .section-heading { margin-bottom: 40px; }
  .columns { grid-template-columns: 1fr 1fr; gap: 50px; }
  .columns .section-heading { margin-bottom: 20px; }
  .best { display: flex; gap: 18px; align-items: center; }
  .best .artwork { width: 150px; flex: none; }
  .album-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 24px 16px; }
  .album-grid.overview { grid-template-columns: repeat(3, minmax(0, 1fr)); padding-top: 20px; }
  .artwork { aspect-ratio: 1; position: relative; background: #242424; display: grid; place-items: center; overflow: hidden; }
  .artwork img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 1; }
  .fallback { color: #aaa; }
  .fallback .icon { width: 32px; height: 32px; }
  .card-title { font-weight: 600; margin-top: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .album-card > .muted { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cover-wrap { position: relative; }
  .cover-wrap .actions { position: absolute; right: 0; bottom: 0; z-index: 2; display: flex; background: #101010dd; opacity: 0; }
  .cover-wrap:hover .actions, .cover-wrap:focus-within .actions { opacity: 1; }
  .icon-button { display: inline-grid; place-items: center; width: 44px; height: 44px; border: 0; background: transparent; color: #fff; flex: none; }
  .track-row { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #333; min-height: 62px; }
  .track-row .artwork { width: 48px; flex: none; }
  .track-title { display: flex; align-items: center; gap: 16px; min-width: 0; flex: 1; padding-right: 16px; }
  .track-name { min-width: 0; flex: 1; display: grid; gap: 4px; overflow-wrap: anywhere; }
  .track-actions { display: flex; flex: none; }
  .track-head, .track-row.full-track { display: grid; grid-template-columns: minmax(0, 30fr) minmax(0, 22fr) minmax(0, 12fr) minmax(0, 22fr) minmax(64px, 8fr) 88px; gap: 0; }
  .track-row.full-track { min-height: 68px; }
  .release, .genre, .label { min-width: 0; padding-right: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .duration { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .track-head { color: #aaa; font-size: 11px; text-transform: uppercase; padding: 12px 0; border-bottom: 1px solid #333; }
  .title-heading { padding-left: 64px; }
  .availability { margin-bottom: 12px; }
  .artists { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 20px; font-size: 16px; min-height: 180px; }
  .artists > div { min-width: 0; text-align: center; }
  .artist-circle { width: 120px; max-width: 100%; aspect-ratio: 1; margin: 0 auto 20px; border-radius: 50%; background: #242424; display: grid; place-items: center; color: #aaa; }
  .artist-name { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 20px; min-height: 40px; overflow-wrap: anywhere; }
  .top-results .artists { height: 180px; overflow: hidden; }
  .skeleton-line { height: 14px; width: 80%; min-width: 64px; margin-top: 8px; background: #242424; }
  .skeleton-line.short { width: 55%; }
  .track-placeholder { display: flex; align-items: center; gap: 16px; min-height: 62px; border-bottom: 1px solid #333; }
  .placeholder-cover { width: 48px; height: 48px; background: #242424; flex: none; }
  .track-placeholder .skeleton-line { width: 45%; }
  .loading-status { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  .context-menu { position: fixed; z-index: 1000; width: min(244px, calc(100vw - 16px)); background: #101010; box-shadow: 0 3px 14px #0009; border: 1px solid #333; color: #fff; }
  .context-menu button, .context-menu a { display: block; box-sizing: border-box; width: 100%; text-align: left; padding: 12px; min-height: 44px; border: 0; background: #101010; font-size: 14px; color: #fff; }
  .context-menu button:hover:not(:disabled), .context-menu a:hover { background: #242424; }
  @media (hover: none) { .cover-wrap .actions { opacity: 1; } }
  @media (max-width: 760px) {
    .qobuz-search { padding: 20px; }
    .overview-close { top: 8px; right: 12px; }
    .refinements { padding-top: 36px; }
    .artists { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .top-results .artists > div:nth-child(n+4) { display: none; }
    .refinements, .top-results, .columns { grid-template-columns: 1fr; gap: 12px; }
    .album-grid, .album-grid.overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .best .artwork { width: 110px; }
    .track-row { flex-wrap: wrap; }
    .track-head, .track-row.full-track { grid-template-columns: minmax(0, 1fr) 54px 88px; gap: 8px; }
    .track-head .release, .genre, .label { display: none; }
    .full-track .release { grid-column: 1; grid-row: 2; padding-left: 64px; font-size: 13px; }
    .full-track .duration { grid-column: 2; grid-row: 1 / span 2; }
    .full-track .track-actions { grid-column: 3; grid-row: 1 / span 2; }
  }
</style>
