<script lang="ts">
  import { onMount, tick } from 'svelte'
  import { page } from '@inertiajs/svelte'
  import Disc3 from '@lucide/svelte/icons/disc-3'
  import Check from '@lucide/svelte/icons/check'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import ExternalLink from '@lucide/svelte/icons/external-link'
  import { listenLaterStorage } from '../../src/infrastructure/storage/listen_later_storage'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  import { conceptId, qobuzCatalog, toNewListenLaterItem, type QobuzCatalogItem } from '~/lib/qobuz_concept'

  const sections = [
    { id: 'all', label: 'Tout', icon: 'userLibrary' },
    { id: 'listen-later', label: 'À écouter plus tard', icon: 'time' },
    { id: 'playlists', label: 'Playlists', icon: 'playlist' },
    { id: 'tracks', label: 'Titres', icon: 'track' },
    { id: 'releases', label: 'Albums', icon: 'album' },
    { id: 'artists', label: 'Artistes', icon: 'artist' },
    { id: 'labels', label: 'Labels', icon: 'label-1' },
    { id: 'awards', label: 'Récompenses', icon: 'award' },
  ] as const
  const drukqs = qobuzCatalog.find((album) => album.id === 'nzxh5konmvw4j')!
  const tracks = [
    ['Jynweythek', '02:23'], ['Vordhosbn', '04:51'], ['Kladfvgbung Mischk', '02:06'],
    ['Omgyjya-Switch7', '04:52'], ['Strotha Tynhe', '02:12'],
  ]
  let path = $state((page.url || '/qobuz').split('?')[0])
  let query = $state('')
  let libraryQuery = $state('')
  let sort = $state('date')
  let layout = $state<'grid' | 'list'>('grid')
  let listenedFilter = $state<'all' | 'pending' | 'listened'>('all')
  let items = $state<ListenLaterItem[]>([])
  let loading = $state(true)
  let ready = $state(false)
  let error = $state('')
  let message = $state('')
  let busy = $state<string[]>([])
  let menuId = $state<string | null>(null)
  let menuTrigger: HTMLButtonElement | undefined
  let menuPosition = $state({ left: 8, top: 8 })
  let retrying = $state(false)

  const isDiscover = $derived(path === '/qobuz/discover')
  const albumId = $derived(path.startsWith('/qobuz/album/') ? decodeURIComponent(path.slice('/qobuz/album/'.length)) : '')
  const album = $derived(qobuzCatalog.find((item) => item.id === albumId))
  const isAlbum = $derived(path.startsWith('/qobuz/album/'))
  const section = $derived(path.startsWith('/qobuz/user-library/') ? path.split('/')[3] : 'all')
  const matches = (text: string, search: string) => text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  const discoveries = $derived(qobuzCatalog.filter((item) => matches(`${item.title} ${item.artists.join(' ')}`, query)))
  type LibraryEntry =
    | { kind: 'album'; title: string; artist: string; date: number }
    | { kind: 'playlist'; title: string; artist: string; date: number }
    | { kind: 'saved'; title: string; artist: string; date: number; item: ListenLaterItem }
  const nativeAlbumSaved = $derived(items.some((item) => item.id === conceptId(drukqs)))
  const counts = $derived({
    all: 2 + items.length - (nativeAlbumSaved ? 1 : 0),
    'listen-later': items.length,
    playlists: 1,
    tracks: items.filter((item) => item.itemType === 'track').length,
    releases: 1 + items.filter((item) => item.itemType === 'album' && item.id !== conceptId(drukqs)).length,
    artists: 2,
    labels: 1,
    awards: 0,
  })
  const visibleEntries = $derived.by(() => {
    const result: LibraryEntry[] = []
    if (section === 'all' || section === 'releases') result.push({ kind: 'album', title: drukqs.title, artist: drukqs.artists[0], date: 0 })
    if (section === 'all' || section === 'playlists') result.push({ kind: 'playlist', title: 'An Introduction to Qobuz', artist: 'Qobuz UK', date: 0 })
    for (const item of items) {
      if (!['all', 'listen-later', 'tracks', 'releases'].includes(section)) continue
      if (section !== 'listen-later' && item.id === conceptId(drukqs)) continue
      if (section === 'tracks' && item.itemType !== 'track') continue
      if (section === 'releases' && item.itemType !== 'album') continue
      if (section === 'listen-later' && listenedFilter !== 'all' && item.hasBeenListened !== (listenedFilter === 'listened')) continue
      result.push({ kind: 'saved', title: item.title, artist: (item.artists || []).join(' · '), date: new Date(item.addedAt).getTime() || 0, item })
    }
    return result.filter((item) => {
      const searchableArtists = item.kind === 'album' ? drukqs.artists.join(' ') : item.artist
      return matches(`${item.title} ${searchableArtists}`, libraryQuery)
    })
      .sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title) : sort === 'artist' ? a.artist.localeCompare(b.artist) : b.date - a.date)
  })

  async function load() {
    if (retrying) return
    retrying = true
    try { items = await listenLaterStorage.getAll(); ready = true; error = '' }
    catch { ready = false; error = 'Impossible de charger votre liste locale. Les modifications sont désactivées.' }
    finally { loading = false; retrying = false }
  }
  onMount(() => {
    path = window.location.pathname
    query = new URLSearchParams(window.location.search).get('q') || ''
    const pop = () => { path = window.location.pathname; menuId = null; query = new URLSearchParams(window.location.search).get('q') || ''; libraryQuery = '' }
    const dismissMenu = (event: Event) => { if (menuId && !(event.target instanceof Element && event.target.closest('.action-menu'))) closeMenu(false) }
    window.addEventListener('popstate', pop)
    window.addEventListener('resize', dismissMenu)
    window.addEventListener('scroll', dismissMenu, true)
    void load()
    return () => { window.removeEventListener('popstate', pop); window.removeEventListener('resize', dismissMenu); window.removeEventListener('scroll', dismissMenu, true) }
  })
  function safeUrl(value?: string): string | undefined {
    if (!value) return undefined
    try {
      const url = new URL(value, 'https://local.invalid')
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined
      return url.origin === 'https://local.invalid' ? `${url.pathname}${url.search}${url.hash}` : url.href
    } catch { return undefined }
  }
  function isBusy(id: string) { return busy.includes(id) }
  function isSaved(item: QobuzCatalogItem) { return items.some((saved) => saved.id === conceptId(item)) }
  async function save(item: QobuzCatalogItem) {
    const id = conceptId(item)
    if (!ready || isBusy(id) || isSaved(item)) return
    busy = [...busy, id]; error = ''
    try {
      const saved = await listenLaterStorage.add(toNewListenLaterItem(item))
      items = [...items, saved]
      message = `« ${item.title} » ajouté à À écouter plus tard.`
      if (menuId === item.id) closeMenu()
    } catch { error = `Impossible d’ajouter « ${item.title} ». Votre liste n’a pas changé.` }
    finally { busy = busy.filter((value) => value !== id) }
  }
  async function toggle(item: ListenLaterItem) {
    if (!ready || isBusy(item.id)) return
    busy = [...busy, item.id]; error = ''
    try {
      const updated = await listenLaterStorage.toggleListened(item.id)
      if (!updated) { error = 'Cet élément n’existe plus. Rechargez la page pour actualiser la liste.'; return }
      items = items.map((value) => value.id === item.id ? updated : value)
      message = `« ${item.title} » : ${updated.hasBeenListened ? 'écouté' : 'à écouter'}.`
    } catch { error = `Impossible de modifier « ${item.title} ». Votre liste n’a pas changé.` }
    finally { busy = busy.filter((value) => value !== item.id) }
  }
  async function remove(item: ListenLaterItem) {
    if (!ready || isBusy(item.id)) return
    busy = [...busy, item.id]; error = ''
    try { await listenLaterStorage.remove(item.id); items = items.filter((value) => value.id !== item.id); message = `« ${item.title} » retiré de la liste.` }
    catch { error = `Impossible de retirer « ${item.title} ». Votre liste n’a pas changé.` }
    finally { busy = busy.filter((value) => value !== item.id) }
  }
  function openMenu(event: MouseEvent, id: string) {
    event.stopPropagation()
    const button = event.currentTarget as HTMLButtonElement
    if (menuId === id) { closeMenu(false); return }
    const rect = button.getBoundingClientRect()
    menuPosition = { left: Math.max(8, Math.min(rect.right - 242, window.innerWidth - 250)), top: rect.bottom }
    menuTrigger = button; menuId = id
    void tick().then(() => {
      if (menuId !== id) return
      const menu = document.querySelector<HTMLElement>('.action-menu')
      if (!menu) return
      const bottom = window.innerHeight - 80
      menuPosition = { ...menuPosition, top: Math.max(8, Math.min(rect.bottom, bottom - menu.offsetHeight)) }
      menu.querySelector<HTMLElement>('button:not(:disabled), a')?.focus({ preventScroll: true })
    })
  }
  function closeMenu(restore = true) { menuId = null; if (restore) void tick().then(() => menuTrigger?.focus()) }
  function menuKey(event: KeyboardEvent) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
    const choices = Array.from((event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('button:not(:disabled), a'))
    if (!choices.length) return
    event.preventDefault()
    const index = choices.indexOf(document.activeElement as HTMLElement)
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : event.key === 'ArrowDown' ? (index + 1) % choices.length : (index - 1 + choices.length) % choices.length
    choices[next].focus()
  }
  function keydown(event: KeyboardEvent) { if (event.key === 'Escape' && menuId) { event.preventDefault(); closeMenu() } }
</script>

<svelte:head><title>Qobuz · MusicKeeper</title><meta name="description" content="Concept indépendant Qobuz et liste d’écoute locale MusicKeeper." /></svelte:head>
<svelte:window onkeydown={keydown} onclick={() => { if (menuId) closeMenu(false) }} />
{#snippet nativeIcon(name: string, size = 20)}
  <svg class="native-icon" width={size} height={size} aria-hidden="true"><use href={`/qobuz-concept/icons.svg#qobuz-icon-${name}`} /></svg>
{/snippet}


{#snippet menu(item: QobuzCatalogItem)}
  <div class="menu-wrap">
    <button class="icon-button menu-trigger" aria-label={`Plus d’options pour ${item.title}`} aria-haspopup="menu" aria-expanded={menuId === item.id} onclick={(event) => openMenu(event, item.id)}>{@render nativeIcon('more', 21)}</button>
    {#if menuId === item.id}
      <div class="action-menu" role="menu" tabindex="-1" style:left={`${menuPosition.left}px`} style:top={`${menuPosition.top}px`} onkeydown={menuKey} onclick={(event) => event.stopPropagation()}>
        <button role="menuitem" disabled title="Lecture indisponible dans ce concept">{@render nativeIcon('addToQueue', 17)} Ajouter à la file d’attente</button>
        <button role="menuitem" disabled title="Lecture indisponible dans ce concept">{@render nativeIcon('playNext', 17)} Lire ensuite</button>
        <div class="menu-rule"></div>
        <button role="menuitem" disabled={!ready || isBusy(conceptId(item)) || isSaved(item)} onclick={() => save(item)}>{@render nativeIcon('time', 17)} {isSaved(item) ? 'Ajouté à écouter plus tard' : 'Ajouter à écouter plus tard'}</button>
        <button role="menuitem" disabled title="Fonction Qobuz indisponible dans ce concept">{@render nativeIcon('share', 17)} Partager</button>
        <button role="menuitem" disabled title="Compte Qobuz non connecté">{@render nativeIcon('addToPlaylist', 17)} Ajouter aux playlists</button>
        <button role="menuitem" disabled title="Navigation vers le label indisponible dans ce concept">{@render nativeIcon('label-1', 17)} Voir le label</button>
        <a role="menuitem" href={item.sourceUrl} target="_blank" rel="noopener noreferrer"><ExternalLink size={17} /> Voir sur Qobuz</a>
      </div>
    {/if}
  </div>
{/snippet}

{#snippet catalogCard(item: QobuzCatalogItem)}
  <article class="music-card" aria-label={`${item.title} par ${item.artists.join(', ')}`}>
    <div class="cover-wrap"><a href={`/qobuz/album/${item.id}`} aria-label={`Voir ${item.title}`}><img src={item.coverArt} alt="" loading="lazy" /></a>{#if item.note}<span class="badge">◉ {item.note}</span>{/if}<div class="cover-actions"><button class="cover-play" disabled title="Lecture indisponible dans ce concept" aria-label="Lecture indisponible">{@render nativeIcon('play-arrow', 20)}</button><button class="icon-button" disabled title="Compte Qobuz non connecté" aria-label="Favoris indisponibles">{@render nativeIcon('favorite', 20)}</button><div class="cover-menu">{@render menu(item)}</div></div></div>
    <div class="card-text"><a class="card-title" href={`/qobuz/album/${item.id}`}>{item.title}</a><p>{#if item.id === drukqs.id}<span class="explicit">E</span> {#if !isDiscover}Album · Aphex Twin · …{:else}{item.artists.join(' · ')}{/if}{:else}{item.artists.join(' · ')}{/if}</p></div>
  </article>
{/snippet}

<div class="app">
  <a class="skip" href="#main">Aller au contenu</a>
  <header class="topbar">
    <a class="wordmark" href="/qobuz/discover" aria-label="Qobuz, découvrir">&#xe929;</a>
    <nav class="topnav" aria-label="Navigation principale">
      <a class:active={isDiscover} href="/qobuz/discover" aria-label="Découvrir">{@render nativeIcon(isDiscover ? 'discoverActive' : 'discover', 19)} <span>Découvrir</span></a>
      <a href="https://www.qobuz.com/fr-fr/magazine" target="_blank" rel="noopener noreferrer" aria-label="Magazine">{@render nativeIcon('booklet', 19)} <span>Magazine</span></a>
      <a class:active={!isDiscover && !isAlbum} href="/qobuz/user-library" aria-label="Bibliothèque">{@render nativeIcon(!isDiscover && !isAlbum ? 'userLibraryActive' : 'userLibrary', 19)} <span>Bibliothèque</span></a>
    </nav>
    <form class="global-search" action="/qobuz/discover" method="get"><label class="sr-only" for="global-search">Rechercher dans les nouveautés</label>{@render nativeIcon('search', 18)}<input id="global-search" name="q" type="search" placeholder="Rechercher" bind:value={query} /><button type="submit" aria-label="Lancer la recherche">{@render nativeIcon('search', 16)}</button></form>
    <button class="avatar" disabled title="Compte indisponible dans ce concept" aria-label="Compte de démonstration indisponible">D</button>
  </header>
  <div class="disclosure">Concept indépendant et non officiel · liste enregistrée uniquement sur cet appareil · aucune lecture ni connexion au compte</div>
  {#if error}<div class="error" role="alert">{error} {#if !ready}<button onclick={() => window.location.reload()}>Recharger la page</button>{/if}</div>{/if}
  <div class="sr-only" role="status" aria-live="polite">{message}</div>
  {#if message}<div class="toast">{message}<button aria-label="Fermer" onclick={() => message = ''}>×</button></div>{/if}

  {#if isDiscover}
    <main id="main" tabindex="-1" class="discover">
      <div class="discover-title"><h1>Découvrir</h1><button class="icon-button" disabled title="Filtres Qobuz indisponibles dans cette sélection" aria-label="Filtres indisponibles">{@render nativeIcon('filter', 20)}</button></div>
      <div class="discover-heading"><div><h2>Nouveautés</h2><p>Sélectionnées par Qobuz.</p></div><button disabled title="Cette sélection statique contient dix albums">Voir tout ›</button></div>
      {#if discoveries.length}<div class="discover-grid">{#each discoveries as item (item.id)}{@render catalogCard(item)}{/each}</div>{:else}<p class="empty">Aucun album trouvé. Essayez une autre recherche.</p>{/if}
    </main>
  {:else if isAlbum}
    <main id="main" tabindex="-1" class="album-page">
      {#if album}
        <section class="album-hero" class:drukqs={album.id === drukqs.id}>
          <img src={album.coverArt} alt="" />
          <div class="album-info"><p>{album.id === drukqs.id ? 'Electronique' : 'Album'}</p><h1>{album.title}</h1><strong>{album.artists.join(' · ')}</strong>
            {#if album.id === drukqs.id}<p class="release">Parution chez <b>Warp Records</b> · 13 novembre 2026 · 35 Titres · 01h 59m 12s</p><p class="description">En 2001, Aphex Twin oublie son lecteur MP3, qui contenait 180 morceaux inédits, dans un avion pour l’Écosse. C’est ainsi un double album…</p>{:else}<p class="release">Extrait de la sélection Découvrir. Consultez Qobuz pour les informations complètes.</p>{/if}
            <div class="hero-actions"><button class="play" disabled title="Lecture indisponible dans ce concept" aria-label="Lecture indisponible">{@render nativeIcon('play-arrow', 20)}</button><button class="icon-button" disabled title="Favoris Qobuz indisponibles" aria-label="Ajouter aux favoris indisponible">{@render nativeIcon('favorite', 22)}</button><button class="icon-button" disabled title="Radio indisponible dans ce concept" aria-label="Radio indisponible">{@render nativeIcon('radio', 22)}</button><button class="icon-button" disabled title="Informations Qobuz indisponibles dans ce concept" aria-label="Informations indisponibles">{@render nativeIcon('info', 22)}</button><button class="icon-button" disabled title="Achats Qobuz indisponibles dans ce concept" aria-label="Achats indisponibles">{@render nativeIcon('purchase', 22)}</button>{@render menu(album)}<a href={album.sourceUrl} target="_blank" rel="noopener noreferrer">Voir sur Qobuz <ExternalLink size={15} /></a></div>
          </div>
        </section>
        {#if album.id === drukqs.id}<div class="album-content"><section class="tracklist"><p>◉ &nbsp;16-Bit<br />&nbsp;&nbsp;&nbsp;&nbsp;44.1 kHz - Stéréo</p><div class="track-heading"><span># &nbsp;&nbsp; TITRE</span><span>DURÉE</span></div>{#each tracks as track, index}<div class="track"><span>{index + 1}</span><div><strong>{track[0]}</strong><p>Aphex Twin</p></div><span>{track[1]}</span></div>{/each}<p class="hint">Extrait de la liste des titres. La lecture n’est pas disponible dans ce concept.</p></section><aside class="label"><h2>Label</h2><strong>Warp Records</strong></aside></div>{:else}<div class="album-content"><p class="hint">La liste des titres n’est pas disponible dans cette sélection statique.</p></div>{/if}
      {:else}<div class="empty"><h1>Album indisponible</h1><p>Cet album ne fait pas partie de la sélection de démonstration.</p><a href="/qobuz/discover">Retour à Découvrir</a></div>{/if}
    </main>
  {:else}
    <main id="main" tabindex="-1" class="library-layout">
      <aside class="sidebar"><h1>Bibliothèque</h1><nav aria-label="Sections de la bibliothèque">{#each sections as entry}<a class:active={section === entry.id} href={`/qobuz/user-library/${entry.id}`}>{@render nativeIcon(entry.icon, 19)}<span>{entry.label}</span><small>{counts[entry.id]}</small></a>{/each}</nav><div class="sidebar-utilities"><button disabled title="Navigation Qobuz indisponible dans ce concept" aria-label="Réduire la barre latérale indisponible">{@render nativeIcon('historyLeft', 20)}</button><button disabled title="Paramètres Qobuz indisponibles dans ce concept" aria-label="Paramètres indisponibles">{@render nativeIcon('settings', 20)}</button><button disabled title="Création de playlist indisponible dans ce concept" aria-label="Créer une playlist indisponible">{@render nativeIcon('add', 20)}</button></div></aside>
      <section class="library-main" aria-label="Contenu de la bibliothèque">
        <div class="toolbar">
          <label class="library-search">{@render nativeIcon('search', 20)}<span class="sr-only">Rechercher dans votre bibliothèque</span><input type="search" placeholder="Rechercher dans votre bibliothèque" bind:value={libraryQuery} /></label>
          <div class="account-filters" aria-label="Filtres de compte indisponibles">
            <button disabled title="Achats Qobuz indisponibles sans compte" aria-label="Filtrer les achats indisponible">{@render nativeIcon('purchase', 18)}</button>
            <button disabled title="Favoris Qobuz indisponibles sans compte" aria-label="Filtrer les favoris indisponible">{@render nativeIcon('favorite', 18)}</button>
            <button disabled title="Abonnements Qobuz indisponibles sans compte" aria-label="Filtrer les abonnements indisponible">{@render nativeIcon('following', 18)}</button>
          </div>
          <div class="view-buttons" aria-label="Affichage"><button class:selected={layout === 'list'} aria-label="Affichage en liste" aria-pressed={layout === 'list'} onclick={() => layout = 'list'}>{@render nativeIcon('viewList', 21)}</button><button class:selected={layout === 'grid'} aria-label="Affichage en grille" aria-pressed={layout === 'grid'} onclick={() => layout = 'grid'}>{@render nativeIcon(layout === 'grid' ? 'viewGridFilled' : 'viewGrid', 20)}</button></div>
          <label class="sort"><span class="sr-only">Trier la bibliothèque</span><select bind:value={sort}><option value="date">Date d’ajout ↓</option><option value="title">Titre A–Z</option><option value="artist">Artiste A–Z</option></select></label><button class="icon-button filter" disabled title="Filtres Qobuz indisponibles dans ce concept" aria-label="Filtres indisponibles">{@render nativeIcon('filter', 20)}</button>
        </div>
        {#if section === 'listen-later'}<div class="list-heading"><div><h2>À écouter plus tard</h2><p>Votre sélection locale · {items.length} {items.length === 1 ? 'élément' : 'éléments'}</p></div><div class="filter-buttons" aria-label="État d’écoute"><button class:selected={listenedFilter === 'all'} aria-pressed={listenedFilter === 'all'} onclick={() => listenedFilter = 'all'}>Tout</button><button class:selected={listenedFilter === 'pending'} aria-pressed={listenedFilter === 'pending'} onclick={() => listenedFilter = 'pending'}>À écouter</button><button class:selected={listenedFilter === 'listened'} aria-pressed={listenedFilter === 'listened'} onclick={() => listenedFilter = 'listened'}>Écouté</button></div></div>{/if}
        {#if loading}<p class="empty">Chargement de votre liste…</p>{:else}
          <div class:row-layout={layout === 'list'} class="library-grid">
            {#each visibleEntries as entry}
              {#if entry.kind === 'album'}{@render catalogCard(drukqs)}
              {:else if entry.kind === 'playlist'}<article class="music-card"><div class="playlist-cover"><img src="/qobuz-concept/introduction.jpg" alt="" /></div><div class="card-text"><strong class="card-title">An Introduction to Qobuz</strong><p>Playlist · Par Qobuz UK</p></div></article>
              {:else}
              {@const item = entry.item}
              {@const cover = safeUrl(item.coverArt)}
              {@const link = safeUrl(item.sourceUrl) || safeUrl(item.externalLinks?.find((value) => safeUrl(value.url))?.url)}
              <article class="music-card saved-card" aria-label={`${item.title} par ${(item.artists || []).join(', ')}`}><div class="cover-wrap">{#if cover}<img src={cover} alt="" loading="lazy" />{:else}<div class="blank"><Disc3 size={34} /></div>{/if}</div><div class="card-text"><strong class="card-title">{item.title}</strong><p>{item.itemType === 'track' ? 'Titre' : 'Album'} · {(item.artists || []).join(' · ')}</p><p>{item.hasBeenListened ? 'Écouté' : 'À écouter'}</p><div class="saved-actions"><button disabled={!ready || isBusy(item.id)} onclick={() => toggle(item)} aria-label={`Marquer ${item.title} ${item.hasBeenListened ? 'à écouter' : 'écouté'}`}><Check size={15} /> {item.hasBeenListened ? 'À écouter' : 'Écouté'}</button><button disabled={!ready || isBusy(item.id)} onclick={() => remove(item)} aria-label={`Retirer ${item.title} de À écouter plus tard`}><Trash2 size={15} /></button>{#if link}<a href={link} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${item.title} dans un nouvel onglet`}><ExternalLink size={15} /></a>{/if}</div></div></article>
              {/if}
            {/each}
          </div>
          {#if section === 'artists' || section === 'labels'}<div class="empty"><p>La consultation des {section === 'artists' ? 'artistes' : 'labels'} de la bibliothèque Qobuz n’est pas disponible dans ce concept local.</p></div>
          {:else if !visibleEntries.length}<div class="empty"><p>{section === 'listen-later' ? 'Votre liste À écouter plus tard est vide ou ne correspond pas aux filtres.' : 'Aucun élément à afficher.'}</p><a href="/qobuz/discover">Découvrir des albums</a></div>{/if}
        {/if}
      </section>
    </main>
  {/if}
  <footer class="player" aria-label="Lecteur de démonstration">
    <input class="player-seek" type="range" min="0" max="100" value="0" disabled title="Lecture indisponible dans ce concept" aria-label="Position de lecture indisponible" />
    <div class="player-track"><div class="player-placeholder">{@render nativeIcon('track', 22)}</div><div><strong>Aucune lecture</strong><p>Lecteur indisponible dans ce concept</p></div><button disabled title="Aucun titre en cours" aria-label="Options du titre indisponibles">{@render nativeIcon('more', 20)}</button></div>
    <div class="player-time" aria-label="Aucune lecture en cours"><span>--:--</span><span>--:--</span></div>
    <div class="player-controls"><button disabled title="Lecture indisponible dans ce concept" aria-label="Lecture aléatoire indisponible">{@render nativeIcon('shuffle', 19)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="Titre précédent indisponible">{@render nativeIcon('skipPrevious', 21)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="Lecture indisponible">{@render nativeIcon('play-arrow', 26)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="Titre suivant indisponible">{@render nativeIcon('skipNext', 21)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="Répétition indisponible">{@render nativeIcon('repeat', 19)}</button></div>
    <div class="player-output"><button disabled title="Lecture indisponible dans ce concept" aria-label="Volume indisponible">{@render nativeIcon('volumeUp', 20)}</button><div class="volume-line"></div><button disabled title="Lecture indisponible dans ce concept" aria-label="Sortie audio indisponible">{@render nativeIcon('audioOutput', 20)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="Appareils indisponibles">{@render nativeIcon('devices', 20)}</button><button disabled title="Lecture indisponible dans ce concept" aria-label="File d’attente indisponible">{@render nativeIcon('playqueue', 20)}</button></div>
  </footer>
</div>

<style>
  @font-face { font-family: Qobuz; src: url('/qobuz-concept/fonts/QobuzSans-Regular.woff2') format('woff2'); font-weight: 400; font-display: swap; }
  @font-face { font-family: Qobuz; src: url('/qobuz-concept/fonts/QobuzSans-Medium.woff2') format('woff2'); font-weight: 500; font-display: swap; }
  @font-face { font-family: Qobuz; src: url('/qobuz-concept/fonts/QobuzSans-Bold.woff2') format('woff2'); font-weight: 700; font-display: swap; }
  @font-face { font-family: QobuzIcons; src: url('/qobuz-concept/fonts/QobuzIcons.woff2') format('woff2'); font-weight: 400; font-display: block; }
  .app { min-height: 100dvh; padding-bottom: 72px; background: #121212; color: #f5f5f5; font: 500 14px/1.4 Qobuz, sans-serif; }
  .app * { box-sizing: border-box; }
  .app a { color: inherit; text-decoration: none; }
  .app button, .app input, .app select { font: inherit; }
  .app button { cursor: pointer; }
  .app button:disabled { cursor: not-allowed; opacity: .5; }
  .app :is(a, button, input, select):focus-visible { outline: 2px solid #f4c66b; outline-offset: 3px; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
  .skip { position: fixed; z-index: 100; top: -70px; left: 8px; padding: 10px; background: #333; }.skip:focus { top: 8px; }
  .topbar { height: 56px; display: flex; align-items: center; gap: 24px; padding: 0 24px; background: #181818; border-bottom: 1px solid #292929; }
  .wordmark { font-family: QobuzIcons; font-size: 27px; font-weight: 400; line-height: 1; margin-right: 2px; }
  .topnav { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .topnav a { height: 39px; display: inline-flex; align-items: center; gap: 10px; padding: 0 12px; border: 1px solid transparent; border-radius: 5px; }
  .topnav a.active { background: #252525; border-color: #363636; }
  .global-search, .library-search { display: flex; align-items: center; gap: 10px; background: #242424; color: #a9a9a9; border-radius: 24px; padding: 0 16px; height: 40px; }
  .global-search { margin-left: auto; width: min(30vw, 370px); }.global-search input, .library-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: #fff; }.global-search input::placeholder, .library-search input::placeholder { color: #aaa; }
  .global-search button { display: inline-flex; align-items: center; justify-content: center; flex: none; border: 0; padding: 4px; color: #ccc; background: transparent; }
  .avatar { width: 40px; height: 40px; border-radius: 50%; border: 0; background: #373739; color: #fff; flex: none; }.avatar:disabled { opacity: 1 !important; }
  .disclosure { position: fixed; z-index: 3; bottom: 73px; right: 8px; color: #aaa; background: #181818; font-size: 10px; padding: 2px 5px; }
  .error { position: relative; z-index: 4; padding: 10px 24px; color: #fff; background: #742a25; }.error button { background: transparent; color: #fff; border: 1px solid #fff; border-radius: 3px; padding: 4px 8px; }
  .toast { position: fixed; z-index: 15; right: 24px; bottom: 90px; background: #333; padding: 12px 16px; border-radius: 4px; box-shadow: 0 4px 18px #0008; }.toast button { color: white; border: 0; background: transparent; margin-left: 14px; }
  .discover { padding: 38px 24px 45px; }.discover h1 { font-size: 48px; line-height: 1.15; margin: 0 0 34px; }.discover-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }.discover-heading h2 { font-size: 23px; margin: 0 0 8px; }.discover-heading p { color: #b5b5b5; margin: 0; }.discover-heading > span { color: #bbb; }
  .discover-grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 28px; }.music-card { min-width: 0; }.cover-wrap { position: relative; width: 100%; aspect-ratio: 1; background: #252525; border-radius: 4px; }.cover-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 4px; }.cover-wrap > a { display: block; width: 100%; height: 100%; }.cover-menu { position: absolute; right: 4px; bottom: 4px; }.menu-trigger { background: #222d !important; border-radius: 50%; }.badge { position: absolute; left: 0; bottom: 24px; background: #ec7900; color: #121212; font-size: 10px; font-weight: 700; padding: 4px 6px; }.card-text { min-width: 0; margin-top: 8px; }.card-title { display: block; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.card-text p { color: #bcbcbc; margin: 1px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.card-text small { color: #aaa; }
  .menu-wrap { position: relative; }.icon-button { display: inline-flex; justify-content: center; align-items: center; width: 40px; height: 40px; background: transparent; color: #fff; border: 0; }.action-menu { position: absolute; z-index: 20; top: 100%; right: 0; width: 242px; padding: 8px 0; border-radius: 4px; background: #303032; box-shadow: 0 8px 24px #0009; }.action-menu button, .action-menu a { width: 100%; min-height: 38px; padding: 8px 16px; display: flex; align-items: center; gap: 14px; text-align: left; color: #eee; background: transparent; border: 0; }.action-menu button:hover:not(:disabled), .action-menu a:hover { background: #444; }.menu-rule { height: 1px; background: #555; margin: 4px 0; }
  .library-layout { display: flex; min-height: calc(100dvh - 128px); }.sidebar { width: 216px; flex: 0 0 216px; padding: 22px 12px; }.sidebar h1 { font-size: 23px; margin: 0 12px 34px; }.sidebar nav { display: grid; gap: 3px; }.sidebar a { display: flex; gap: 10px; align-items: center; min-height: 39px; padding: 0 12px; border-radius: 5px; white-space: nowrap; }.sidebar a.active { background: #252525; }.sidebar a span { overflow: hidden; text-overflow: ellipsis; }.sidebar small { margin-left: auto; color: #bdbdbd; }
  .library-main { min-width: 0; flex: 1; padding: 16px 24px 50px 16px; }.toolbar { min-height: 61px; display: flex; align-items: flex-start; gap: 18px; border-bottom: 1px solid #292929; margin-bottom: 24px; }.library-search { width: min(380px, 42%); flex-shrink: 1; border: 1px solid #363636; }.view-buttons { display: flex; margin-left: auto; gap: 4px; }.view-buttons button { border: 0; color: #aaa; background: transparent; width: 34px; height: 40px; }.view-buttons button.selected { color: #f6c875; }.sort select { background: #252525; color: #fff; border: 1px solid #383838; border-radius: 4px; padding: 10px 32px 10px 12px; max-width: 200px; }.filters-disabled { border-radius: 50%; background: #252525; flex: none; }.library-grid { display: grid; grid-template-columns: repeat(auto-fill, 178px); gap: 28px; }.playlist-cover { aspect-ratio: 1; display: grid; place-items: center; border-radius: 4px; background: radial-gradient(circle at 50% 30%, #9a7038, #392817); overflow: hidden; }.playlist-cover img { width: 90%; }.blank { height: 100%; display: grid; place-items: center; color: #999; }.list-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 24px; }.list-heading h2 { margin: 0 0 4px; font-size: 22px; }.list-heading p { color: #aaa; margin: 0; }.filter-buttons { display: flex; gap: 6px; flex-wrap: wrap; }.filter-buttons button { border: 1px solid #555; color: #fff; background: #242424; padding: 7px 12px; border-radius: 20px; }.filter-buttons button.selected { background: #eee; color: #151515; border-color: #eee; }.saved-actions { display: flex; gap: 5px; margin-top: 8px; }.saved-actions button, .saved-actions a { display: inline-flex; align-items: center; gap: 4px; min-height: 32px; padding: 5px 7px; background: #292929; border: 1px solid #4a4a4a; border-radius: 4px; color: #fff; font-size: 12px; }.row-layout { display: flex; flex-direction: column; gap: 10px; }.row-layout .music-card { display: flex; gap: 14px; align-items: center; }.row-layout .cover-wrap, .row-layout .playlist-cover { width: 64px; height: 64px; flex: none; }.row-layout .card-text { margin: 0; }.row-layout .cover-menu { right: -4px; bottom: -4px; }.empty { color: #aaa; padding: 40px 0; }.empty a { color: #f3ca78; text-decoration: underline; }
  .album-hero { display: flex; gap: 32px; padding: 40px 24px; background: linear-gradient(#50403a, #302521); }.album-hero.drukqs { background: linear-gradient(#704322, #3d2516); }.album-hero > img { width: 242px; height: 242px; object-fit: cover; border-radius: 4px; flex: none; }.album-info { min-width: 0; }.album-info > p { color: #ddd; margin: 0 0 6px; }.album-info h1 { font-size: 34px; line-height: 1.15; margin: 0 0 5px; }.album-info strong { font-size: 17px; }.album-info .release { margin-top: 16px; }.album-info .description { max-width: 840px; }.hero-actions { display: flex; align-items: center; gap: 18px; margin-top: 16px; }.hero-actions a { display: inline-flex; gap: 6px; align-items: center; font-size: 12px; }.play { width: 52px; height: 52px; background: white; color: #111; border: 0; border-radius: 50%; }.album-content { display: flex; gap: 24px; padding: 24px; }.tracklist { flex: 1; min-width: 0; }.tracklist > p { margin: 0 0 28px; }.track-heading { display: flex; justify-content: space-between; color: #aaa; font-size: 11px; margin: 0 40px 10px 20px; }.track { display: grid; grid-template-columns: 30px 1fr auto; align-items: center; gap: 12px; min-height: 64px; padding: 8px 40px 8px 20px; border-bottom: 1px solid #2d2d2d; }.track p { color: #aaa; margin: 0; }.label { border-left: 1px solid #292929; padding-left: 20px; width: 26%; }.label h2 { font-size: 20px; margin: 0 0 20px; }.hint { color: #aaa; }
  .player { height: 72px; position: fixed; bottom: 0; left: 0; right: 0; z-index: 10; display: grid; grid-template-columns: 1fr 1fr 1fr; align-items: center; gap: 12px; background: #141414; border-top: 3px solid #333; }.player-track { display: flex; align-items: center; gap: 14px; min-width: 0; }.player-placeholder { height: 69px; width: 69px; background: #292929; color: #888; display: grid; place-items: center; flex: none; }.player-track p { color: #aaa; margin: 2px 0 0; font-size: 12px; }.player-controls { display: flex; align-items: center; justify-content: center; gap: 18px; }.player-controls button { border: 0; background: transparent; color: #eee; padding: 4px; }.volume { display: flex; justify-content: end; align-items: center; gap: 10px; color: #888; padding-right: 24px; }.volume span { display: block; width: 94px; height: 3px; background: #555; }
  @media (max-width: 800px) { .topbar { gap: 10px; padding: 0 12px; }.topnav { gap: 0; }.topnav a { padding: 0 8px; }.topnav a span { display: none; }.global-search { width: auto; flex: 1; }.wordmark { font-size: 23px; }.sidebar { width: 180px; flex-basis: 180px; }.library-main { padding-right: 14px; }.discover-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }.volume { display: none; }.player { grid-template-columns: 1fr 1fr; } }
  @media (max-width: 560px) { .library-layout { display: block; }.sidebar { width: 100%; padding: 16px 12px 8px; }.sidebar h1 { margin: 0 0 12px; }.sidebar nav { display: flex; overflow-x: auto; gap: 4px; }.sidebar a { flex: none; padding: 0 10px; }.sidebar small { margin-left: 2px; }.library-main { padding: 12px; }.toolbar { gap: 6px; flex-wrap: wrap; padding-bottom: 12px; }.library-search { width: 100%; flex: 1 0 100%; }.view-buttons { margin-left: 0; }.sort { margin-left: auto; }.library-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px 12px; }.discover { padding: 26px 12px; }.discover h1 { font-size: 38px; }.discover-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 12px; }.album-hero { padding: 20px 12px; gap: 16px; flex-direction: column; }.album-hero > img { width: min(60vw, 242px); height: auto; aspect-ratio: 1; }.album-info h1 { font-size: 27px; }.album-content { padding: 16px 12px; }.label { display: none; }.player-track p { display: none; }.player-track strong { font-size: 12px; }.player-controls { gap: 5px; }.player-controls button { padding: 2px; }.disclosure { font-size: 9px; max-width: 90%; } }
  .native-icon { display: block; flex: none; fill: currentColor; }
  .sidebar { width: 208px; flex-basis: 208px; position: relative; }
  .sidebar h1 { font-size: 22px; font-weight: 700; color: #fff; }
  .discover h1, .discover-heading h2, .album-info h1 { font-weight: 700; }
  .library-main { padding-left: 24px; }
  .sidebar-utilities { position: absolute; bottom: 12px; left: 12px; display: flex; gap: 10px; }
  .sidebar-utilities button { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 50%; color: #fff; background: #292929; }
  .account-filters { display: flex; gap: 12px; align-items: center; }
  .account-filters button { width: 52px; height: 30px; border: 0; border-radius: 20px; color: #333; background: #555; display: flex; align-items: center; padding: 3px; }
  .account-filters button svg { width: 24px; height: 24px; padding: 3px; border-radius: 50%; background: #fff; }
  .view-buttons { margin-left: auto; }
  .discover-title { display: flex; justify-content: space-between; align-items: flex-start; }
  .discover-title .icon-button { border-radius: 50%; background: #292929; }
  .discover-heading > button { color: #bbb; border: 0; background: none; font: inherit; }
  .cover-actions { position: absolute; bottom: 4px; left: 8px; right: 4px; display: flex; align-items: center; gap: 4px; opacity: 0; }
  .music-card:hover .cover-actions, .music-card:focus-within .cover-actions { opacity: 1; }
  .cover-actions .cover-menu { position: static; margin-left: auto; }
  .cover-play { display: grid; place-items: center; width: 40px; height: 40px; border: 0; border-radius: 50%; background: #fff; color: #121212; }
  .explicit { display: inline-block; padding: 0 3px; border-radius: 2px; background: #aaa; color: #161616; font-size: 10px; line-height: 14px; }
  .action-menu { position: fixed; right: auto; max-height: calc(100dvh - 88px); overflow-y: auto; }
  .player { grid-template-columns: minmax(0, 1.3fr) 45px minmax(180px, 1fr) minmax(0, 1.2fr); }
  .player-track > button, .player-output button { border: 0; background: transparent; color: #eee; padding: 5px; }
  .player-track > button { margin-left: auto; }
  .player-time { display: grid; color: #999; font-size: 12px; }
  .player-output { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding-right: 16px; }
  .volume-line { width: 92px; height: 3px; background: #777; }
  .player-seek { position: absolute; top: -5px; left: 0; width: 100%; height: 3px; margin: 0; accent-color: #777; }
  @media (max-width: 800px) { .sidebar { width: 180px; flex-basis: 180px; }.library-main { padding-left: 16px; }.account-filters { gap: 3px; }.account-filters button { width: 35px; }.player { grid-template-columns: 1fr 1fr; }.player-time, .player-output { display: none; } }
  @media (max-width: 560px) { .sidebar { width: 100%; }.sidebar h1 { margin: 0 0 12px; }.sidebar-utilities { display: none; }.library-main { padding: 12px; }.account-filters { display: none; }.cover-actions { opacity: 1; }.cover-actions > button { display: none; }.hero-actions { flex-wrap: wrap; gap: 8px; } }
</style>
