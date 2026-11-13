<script lang="ts">
  import { onMount, tick } from 'svelte'
  import Bookmark from '@lucide/svelte/icons/bookmark'
  import Compass from '@lucide/svelte/icons/compass'
  import Search from '@lucide/svelte/icons/search'
  import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import Check from '@lucide/svelte/icons/check'
  import Plus from '@lucide/svelte/icons/plus'
  import X from '@lucide/svelte/icons/x'
  import Headphones from '@lucide/svelte/icons/headphones'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import CircleCheck from '@lucide/svelte/icons/circle-check'
  import Info from '@lucide/svelte/icons/info'
  import ListMusic from '@lucide/svelte/icons/list-music'
  import Disc3 from '@lucide/svelte/icons/disc-3'
  import { listenLaterStorage } from '../../src/infrastructure/storage/listen_later_storage'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  import {
    conceptAlbums,
    conceptId,
    conceptCover,
    qobuzSearch,
    toListenLaterItem,
    type ConceptAlbum,
  } from '~/lib/qobuz_concept'

  let view = $state<'discover' | 'keeper'>('discover')
  let query = $state('')
  let genre = $state('All discoveries')
  let filter = $state<'All saved' | 'To listen' | 'Listened'>('All saved')
  let items = $state<ListenLaterItem[]>([])
  let ready = $state(false)
  let busy = $state<string[]>([])
  let storageError = $state('')
  let message = $state('')
  let selectedAlbum = $state<ConceptAlbum | null>(null)
  let aboutDialog: HTMLDialogElement
  let albumDialog: HTMLDialogElement
  const featured = conceptAlbums[0]
  const genres = ['All discoveries', 'Jazz', 'Alternative', 'Electronic']
  const filters = ['All saved', 'To listen', 'Listened'] as const
  const toListen = $derived(items.filter((item) => !item.hasBeenListened).length)
  const normalizedQuery = $derived(query.trim().toLocaleLowerCase())
  const albums = $derived(
    conceptAlbums.filter(
      (album) =>
        (genre === 'All discoveries' || album.genre === genre) &&
        `${album.title} ${album.artist}`.toLocaleLowerCase().includes(normalizedQuery)
    )
  )
  const savedItems = $derived(
    [...items]
      .reverse()
      .filter(
        (item) =>
          (filter === 'All saved' || item.hasBeenListened === (filter === 'Listened')) &&
          `${item.title} ${item.artists.join(' ')}`.toLocaleLowerCase().includes(normalizedQuery)
      )
  )
  const isSaved = (album: ConceptAlbum) => items.some((item) => item.id === conceptId(album))

  async function loadLibrary() {
    storageError = ''
    try {
      items = await listenLaterStorage.getAll()
      ready = true
    } catch {
      ready = false
      storageError = 'Your library could not be opened. Allow browser storage, then reload to try again.'
    }
  }

  onMount(() => {
    void loadLibrary()
  })

  function navigate(next: 'discover' | 'keeper') {
    view = next
    query = ''
    message = ''
  }

  async function save(album: ConceptAlbum) {
    const id = conceptId(album)
    if (!ready || isSaved(album) || busy.includes(id)) return
    busy = [...busy, id]
    storageError = ''
    try {
      const stored = await listenLaterStorage.add(toListenLaterItem(album))
      // Storage loads oldest first, so appending preserves its default order (ADR 0001).
      items = [...items, stored]
      message = `${album.title} saved to MusicKeeper. A good listen, waiting for you.`
    } catch {
      storageError = 'This album could not be saved. Your existing library has not been removed.'
    } finally {
      busy = busy.filter((value) => value !== id)
    }
  }

  async function toggleListened(item: ListenLaterItem) {
    if (busy.includes(item.id)) return
    busy = [...busy, item.id]
    storageError = ''
    try {
      const updated = await listenLaterStorage.toggleListened(item.id)
      if (updated) {
        items = items.map((existing) => (existing.id === updated.id ? updated : existing))
        message = `${updated.title} marked as ${updated.hasBeenListened ? 'listened' : 'unlistened'}.`
      } else {
        items = items.filter((existing) => existing.id !== item.id)
        message = `${item.title} is no longer in your library.`
      }
    } catch {
      storageError = 'The listening status could not be updated. Please try again.'
    } finally {
      busy = busy.filter((value) => value !== item.id)
    }
  }

  async function remove(item: ListenLaterItem) {
    if (busy.includes(item.id)) return
    busy = [...busy, item.id]
    storageError = ''
    try {
      await listenLaterStorage.remove(item.id)
      items = items.filter((existing) => existing.id !== item.id)
      message = `${item.title} removed from MusicKeeper.`
    } catch {
      storageError = 'This album could not be removed. Please try again.'
    } finally {
      busy = busy.filter((value) => value !== item.id)
    }
  }

  async function explore(album: ConceptAlbum) {
    selectedAlbum = album
    await tick()
    albumDialog.showModal()
  }

  function useFallbackCover(event: Event) {
    const image = event.currentTarget as HTMLImageElement
    image.onerror = null
    image.src = '/blank-album.svg'
  }
</script>

<svelte:head>
  <title>Qobuz × MusicKeeper — An independent concept</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="concept">
  <a class="skip-link" href="#concept-content">Skip to content</a>
  <aside class="sidebar" aria-label="Application navigation">
    <a class="wordmark" href="/qobuz" aria-label="Qobuz concept home">
      <svg viewBox="0 0 36 40" aria-hidden="true"><circle cx="17" cy="17" r="13" fill="none" stroke="currentColor" stroke-width="5" /><circle cx="17" cy="17" r="4" fill="currentColor" /><path d="m23 28 8 9" stroke="currentColor" stroke-width="5" /></svg>
      qobuz<span class="concept-tag">CONCEPT</span>
    </a>
    <div class="nav-label">YOUR LISTENING SPACE</div>
    <nav class="main-nav" aria-label="Main">
      <button class:active={view === 'discover'} aria-current={view === 'discover' ? 'page' : undefined} onclick={() => navigate('discover')}><Compass size={20} /> Discover <span class="nav-dot"></span></button>
      <button aria-label="MusicKeeper" class:active={view === 'keeper'} aria-current={view === 'keeper' ? 'page' : undefined} onclick={() => navigate('keeper')}><Bookmark size={20} /> <span>MusicKeeper</span> <span class="nav-count">{items.length}</span></button>
    </nav>
    <div class="sidebar-note">
      <div class="keeper-symbol"><Bookmark size={20} /></div>
      <p>Less scrolling.<br /><strong>More listening.</strong></p>
      <span>A little space for the music you don't want to forget.</span>
      <button onclick={() => aboutDialog.showModal()}>Meet the idea <ArrowRight size={14} /></button>
    </div>
    <div class="sidebar-bottom">
      <button class="about-button" onclick={() => aboutDialog.showModal()}><Info size={17} /> About this concept</button>
      <a href="/library/listen-later" class="native-link">Open MusicKeeper <ArrowUpRight size={15} /></a>
      <span class="independent"><span></span> Independent concept</span>
    </div>
  </aside>

  <div class="workspace">
    <header class="topbar">
      <div class="breadcrumb">Your music <span>/</span> <strong>{view === 'discover' ? 'Discover' : 'MusicKeeper'}</strong></div>
      <label class="search-field"><Search size={18} /><input aria-label="Search albums and artists" type="search" placeholder="Search albums and artists" bind:value={query} /><span class="search-hint">Explore</span></label>
      <button class="profile" onclick={() => aboutDialog.showModal()} aria-label="About the independent demo">mk<span></span></button>
    </header>

    <main id="concept-content" tabindex="-1">
      <div class="page-heading">
        <div><p class="eyebrow">{view === 'discover' ? 'HUMAN CURIOSITY. GREAT MUSIC.' : 'A LITTLE LESS “WHAT WAS THAT ALBUM?”'}</p><h1>{view === 'discover' ? 'A world worth listening to.' : 'Your next great listen.'}</h1></div>
        <span class="edition">QOBUZ <span>×</span> MUSICKEEPER <span class="edition-line"></span> A PRODUCT EXPLORATION</span>
      </div>

      {#if storageError}
        <div class="error-banner" role="alert"><p>{storageError}</p>{#if !ready}<button onclick={() => window.location.reload()}>Reload to try again</button>{/if}</div>
      {/if}
      <div class="announcement" role="status" aria-live="polite">{message}</div>

      {#if view === 'discover'}
        <section class="hero" aria-labelledby="hero-title">
          <div class="hero-content">
            <span class="hero-kicker"><span></span> INTRODUCING MUSICKEEPER</span>
            <h2 id="hero-title">Great finds deserve<br />a <em>second listen.</em></h2>
            <p>For the albums that catch your ear.<br />Save them now. Give them your time later.</p>
            <button class="primary-button" disabled={!ready || isSaved(featured) || busy.includes(conceptId(featured))} onclick={() => save(featured)}>{#if isSaved(featured)}<Check size={17} /> Album kept{:else}<Bookmark size={17} /> Keep this album{/if}</button>
            <span class="hero-footnote">Your curiosity. Kept in one place.</span>
          </div>
          <div class="hero-art">
            <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div>
            <div class="vinyl"><div></div></div>
            <button class="featured-cover" onclick={() => explore(featured)} aria-label="Explore featured album Endlessness"><img src={conceptCover(featured)} alt="Endlessness album artwork" width="600" height="600" fetchpriority="high" /></button>
            <div class="floating-note"><span class="floating-icon"><Bookmark size={17} /></span><div>A discovery today.<br /><strong>A favourite tomorrow.</strong></div></div>
            <div class="hero-caption"><span class="tiny-line"></span> ON OUR RADAR <strong>Nala Sinephro · Endlessness</strong></div>
          </div>
        </section>

        <section class="discover-section" aria-labelledby="selection-title">
          <div class="section-heading"><div><p class="eyebrow">FOLLOW YOUR CURIOSITY</p><h2 id="selection-title">Find your next <em>“you need to hear this.”</em></h2></div><span class="selection-note">A sample editorial selection <span>↙</span></span></div>
          <div class="selection-toolbar"><div class="chips" aria-label="Filter discoveries by genre">{#each genres as value}<button class:chosen={genre === value} aria-pressed={genre === value} onclick={() => (genre = value)}>{value}</button>{/each}</div><span class="result-count">{albums.length} discoveries</span></div>
          <div class="album-grid">
            {#each albums as album}
              {@const saved = isSaved(album)}
              <article class="album-card" aria-label={`${album.title} by ${album.artist}`}>
                <button class="cover-button" onclick={() => explore(album)} aria-label={`Explore ${album.title}`}><img src={conceptCover(album)} alt={`${album.title} album artwork`} width="600" height="600" loading="lazy" /><span class="cover-overlay">A closer listen <ArrowUpRight size={18} /></span></button>
                <div class="album-meta"><span>{album.genre}</span><span>{album.year}</span></div>
                <div class="album-title-row"><div><h3>{album.title}</h3><p>{album.artist}</p></div><button class="save-button" class:saved disabled={!ready || saved || busy.includes(conceptId(album))} aria-label={saved ? `Saved ${album.title}` : `Save ${album.title} for later`} onclick={() => save(album)}>{#if saved}<Check size={19} />{:else}<Plus size={20} />{/if}</button></div>
                <p class="album-note">{album.note}</p>
              </article>
            {/each}
          </div>
          {#if albums.length === 0}<div class="empty-state"><Search size={30} /><h3>No albums found.</h3><p>Try another artist, album or genre.</p><button onclick={() => { query = ''; genre = 'All discoveries' }}>Clear search and filters <ArrowRight size={16} /></button></div>{/if}
        </section>

        <section class="idea-banner" aria-labelledby="idea-title"><div class="idea-icon"><ListMusic size={28} /></div><div><span class="eyebrow">NOT ANOTHER PLAYLIST. A PROMISE TO LISTEN.</span><h2 id="idea-title">Discovery is only the beginning.</h2><p>Make a little room for what comes next. MusicKeeper remembers, so you can just listen.</p></div><button onclick={() => navigate('keeper')}>Your listening queue <ArrowRight size={18} /></button></section>
      {:else}
        <section class="library-summary" aria-label="Your library at a glance"><div class="summary-symbol"><Bookmark size={28} /></div><div><h2>A good listen, waiting for you.</h2><p>The discoveries you kept. The records you made time for.</p></div><div class="summary-stat"><strong>{toListen}</strong><span>to listen</span></div><div class="summary-stat"><strong>{items.length - toListen}</strong><span>listened</span></div></section>
        <div class="keeper-heading"><div class="chips" aria-label="Filter your library">{#each filters as value}<button class:chosen={filter === value} aria-pressed={filter === value} onclick={() => (filter = value)}>{value}</button>{/each}</div><a href="/library/listen-later">Open full MusicKeeper library <ArrowUpRight size={15} /></a></div>
        <div class="saved-list">
          {#each savedItems as item}
            <article class="saved-row" aria-label={`${item.title} by ${item.artists.join(', ')}`}>
              <img src={item.coverArt || '/blank-album.svg'} alt="" width="88" height="88" onerror={useFallbackCover} />
              <div class="saved-info"><span class="saved-type">{item.itemType} <span>·</span> {item.releaseDate?.slice(0, 4) || 'Saved discovery'}</span><h3>{item.title}</h3><p>{item.artists.join(', ')}</p></div>
              <span class="status-label" class:listened={item.hasBeenListened}>{#if item.hasBeenListened}<CircleCheck size={14} /> Listened{:else}<span class="status-dot"></span> To listen{/if}</span>
              <div class="saved-actions"><button class="listen-toggle" disabled={busy.includes(item.id)} aria-label={`Mark ${item.title} as ${item.hasBeenListened ? 'unlistened' : 'listened'}`} onclick={() => toggleListened(item)}>{#if item.hasBeenListened}<Check size={18} /><span>Listened</span>{:else}<Headphones size={18} /><span>Mark listened</span>{/if}</button><a class="icon-button" href={qobuzSearch(item.artists.join(' '), item.title)} target="_blank" rel="noopener noreferrer" aria-label={`Search for ${item.title} on Qobuz`}><ArrowUpRight size={19} /></a><button class="icon-button remove-button" disabled={busy.includes(item.id)} onclick={() => remove(item)} aria-label={`Remove ${item.title}`}><Trash2 size={17} /></button></div>
            </article>
          {/each}
        </div>
        {#if !ready && !storageError}<div class="empty-state"><p>Opening your listening library…</p></div>{:else if ready && savedItems.length === 0}<div class="empty-state"><Bookmark size={36} /><h2>{items.length === 0 ? 'Your next discovery belongs here.' : 'No albums in this view.'}</h2><p>{items.length === 0 ? 'Save an album that catches your ear. It will be here when you have a moment.' : 'Try another filter or clear your search to find your saved music.'}</p><button onclick={() => { if (items.length === 0) navigate('discover'); else { query = ''; filter = 'All saved' } }}>{items.length === 0 ? 'Find something worth keeping' : 'Show all saved albums'} <ArrowRight size={16} /></button></div>{/if}
        <p class="storage-note"><Bookmark size={14} /> This is your real MusicKeeper library, stored in this browser. No account. No sync. Just your music.</p>
      {/if}
      <footer class="page-footer"><span>Made for the love of listening.</span><span>Independent product concept <span>·</span> Not affiliated with Qobuz</span><button onclick={() => aboutDialog.showModal()}>The thinking behind it <ArrowUpRight size={13} /></button></footer>
    </main>

    <div class="listening-dock"><div class="dock-icon"><Disc3 size={27} /></div><div class="dock-copy"><strong>Good music. Better remembered.</strong><span>{ready ? `${toListen} ${toListen === 1 ? 'discovery' : 'discoveries'} waiting for your next quiet moment.` : 'A home for your next great listen.'}</span></div><button onclick={() => navigate(view === 'discover' ? 'keeper' : 'discover')}>{view === 'discover' ? 'Open MusicKeeper' : 'Keep discovering'} <ArrowRight size={17} /></button><span class="dock-brand">MUSICKEEPER <span>×</span> QOBUZ</span></div>
  </div>
</div>

<dialog class="concept-dialog" bind:this={aboutDialog} aria-labelledby="about-title">
  <button class="dialog-close" aria-label="Close dialog" onclick={() => aboutDialog.close()}><X size={21} /></button>
  <span class="dialog-eyebrow">AN INDEPENDENT PRODUCT EXPLORATION</span>
  <div class="dialog-brand"><Bookmark size={28} /> MusicKeeper <span>×</span> Qobuz</div>
  <h2 id="about-title">From discovery<br />to a deeper listen.</h2>
  <p>Music is easy to discover. Finding the time to really listen is harder. This concept brings MusicKeeper's simple listen-later library into a Qobuz-inspired discovery experience.</p>
  <div class="about-grid"><div><strong>What works</strong><p>Save albums, return later, mark them listened and remove them. The same IndexedDB library powers the full MusicKeeper app.</p></div><div><strong>What's a concept</strong><p>A fixed sample selection, not Qobuz's live catalog. No streaming or Qobuz account connection.</p></div></div>
  <p class="about-disclosure">Independent concept, not affiliated with or endorsed by Qobuz. Inspired by Qobuz's public focus on human curation. Album artwork: sample thumbnails via Apple iTunes; all rights remain with their respective owners. Library data stays in this browser and is not synced; clearing site data removes it.</p>
  <div class="about-links"><a href="https://community.qobuz.com/press-en/qobuz-unveils-its-new-discover-page" target="_blank" rel="noopener noreferrer">Qobuz's discovery philosophy <ArrowUpRight size={14} /></a><a href="/library/listen-later">Explore MusicKeeper <ArrowRight size={14} /></a></div>
</dialog>

<dialog class="concept-dialog album-dialog" bind:this={albumDialog} aria-labelledby="album-dialog-title">
  <button class="dialog-close" aria-label="Close album details" onclick={() => albumDialog.close()}><X size={21} /></button>
  {#if selectedAlbum}
    <img class="detail-cover" src={conceptCover(selectedAlbum)} alt={`${selectedAlbum.title} album artwork`} width="600" height="600" />
    <span class="dialog-eyebrow">SAMPLE SELECTION · {selectedAlbum.genre} · {selectedAlbum.year}</span>
    <h2 id="album-dialog-title">{selectedAlbum.title}</h2><p class="detail-artist">{selectedAlbum.artist}</p><p>{selectedAlbum.description}</p>
    <div class="detail-actions"><button class="primary-button" disabled={!ready || isSaved(selectedAlbum) || busy.includes(conceptId(selectedAlbum))} onclick={() => selectedAlbum && save(selectedAlbum)}>{#if isSaved(selectedAlbum)}<Check size={17} /> Saved to MusicKeeper{:else}<Bookmark size={17} /> Save for later{/if}</button><a href={qobuzSearch(selectedAlbum.artist, selectedAlbum.title)} target="_blank" rel="noopener noreferrer">Search on Qobuz <ArrowUpRight size={17} /></a></div>
    <p class="detail-disclaimer">Opens Qobuz search in a new tab. No playback in this concept.</p>
    {#if storageError}<p role="alert" class="dialog-error">{storageError}</p>{/if}
  {/if}
</dialog>

<style>
  .concept { --ink: #202823; --muted: #697169; --paper: #f8f9f5; --green: #176b4e; --line: #e3e7df; color: var(--ink); background: var(--paper); min-height: 100vh; font-family: 'Arial', 'Helvetica Neue', sans-serif; font-size: 14px; line-height: 1.5; }
  .concept :global(*), .concept-dialog, .concept-dialog :global(*) { box-sizing: border-box; }
  .concept :global(button), .concept-dialog :global(button) { cursor: pointer; font: inherit; }
  .concept :global(button:disabled), .concept-dialog :global(button:disabled) { cursor: default; }
  .concept :global(a) { text-decoration: none; color: inherit; }
  .concept :global(button:focus-visible), .concept :global(a:focus-visible), .concept :global(input:focus-visible), .concept-dialog :global(button:focus-visible), .concept-dialog :global(a:focus-visible) { outline: 3px solid #a56b21; outline-offset: 4px; }
  .concept :global(svg), .concept-dialog :global(svg) { flex-shrink: 0; }
  .skip-link { position: fixed; left: 12px; top: -100px; padding: 12px 20px; background: white; z-index: 50; }
  .skip-link:focus { top: 12px; }
  .sidebar { position: fixed; inset: 0 auto 0 0; width: 228px; background: #fff; border-right: 1px solid var(--line); padding: 35px 22px 24px; display: flex; flex-direction: column; z-index: 10; }
  .wordmark { display: flex; align-items: center; gap: 5px; font-size: 34px; font-weight: 700; letter-spacing: -2px; position: relative; width: fit-content; margin-left: 8px; margin-bottom: 62px; }
  .wordmark svg { width: 31px; height: 36px; }
  .concept-tag { position: absolute; right: -10px; top: 43px; font-size: 8px; font-weight: 600; letter-spacing: 2px; color: var(--muted); }
  .nav-label { color: #7c837c; font-size: 9px; font-weight: 700; letter-spacing: 1.7px; padding-left: 15px; margin-bottom: 15px; }
  .main-nav { display: flex; flex-direction: column; gap: 8px; }
  .main-nav button { border: 0; background: none; display: flex; align-items: center; text-align: left; gap: 13px; padding: 13px 14px; border-radius: 7px; color: #626a63; font-weight: 600; }
  .main-nav button.active { background: #edf3ec; color: #245f42; }
  .main-nav button:hover { background: #f0f3ed; }
  .nav-dot { margin-left: auto; width: 5px; height: 5px; border-radius: 50%; background: var(--green); }
  .nav-count { margin-left: auto; border: 1px solid #dce5d8; color: #496749; border-radius: 5px; font-size: 10px; min-width: 20px; text-align: center; padding: 1px 4px; }
  .sidebar-note { border-top: 1px solid var(--line); margin: 30px 13px 0; padding-top: 25px; }
  .keeper-symbol { color: #6c8667; margin-bottom: 15px; }
  .sidebar-note p { font-family: Georgia, serif; font-size: 22px; line-height: 1.35; margin: 0 0 12px; }
  .sidebar-note strong { font-weight: 400; font-style: italic; }
  .sidebar-note > span { color: #7c827a; font-size: 11px; display: block; line-height: 1.8; }
  .sidebar-note button { border: 0; background: none; color: #3e654a; font-size: 11px; display: flex; align-items: center; gap: 12px; padding: 16px 0; }
  .sidebar-bottom { margin-top: auto; padding: 35px 11px 0; display: flex; flex-direction: column; gap: 18px; }
  .about-button, .native-link { display: flex; align-items: center; gap: 10px; font-size: 11px !important; color: #687267 !important; background: none; border: 0; padding: 0; }
  .native-link { font-size: 10px !important; }
  .independent { display: flex; gap: 7px; align-items: center; color: #7f857c; font-size: 9px; margin-top: 4px; }
  .independent > span { width: 5px; height: 5px; background: #90a67a; border-radius: 50%; }
  .workspace { margin-left: 228px; padding-bottom: 82px; }
  .topbar { height: 85px; padding: 0 44px; display: flex; gap: 24px; align-items: center; border-bottom: 1px solid var(--line); background: #fbfcf9; }
  .breadcrumb { color: #7d837b; font-size: 11px; display: flex; align-items: center; gap: 14px; white-space: nowrap; }
  .breadcrumb strong { color: #414c41; font-weight: 500; }
  .breadcrumb > span { color: #b4bbae; }
  .search-field { display: flex; gap: 10px; align-items: center; margin-left: auto; width: 345px; border: 1px solid #e0e5dc; background: #fff; padding: 10px 12px; border-radius: 6px; color: #838c7f; }
  .search-field input { width: 100%; min-width: 0; color: var(--ink); border: 0; background: transparent; outline-offset: 4px; font: inherit; font-size: 11px; }
  .search-hint { font-size: 8px; border-left: 1px solid var(--line); padding-left: 9px; }
  .profile { position: relative; border: 1px solid #d3dbcc; border-radius: 50%; background: #e7ecdf; width: 32px; height: 32px; color: #4d6342; font-family: Georgia, serif !important; font-size: 13px !important; }
  .profile > span { position: absolute; width: 7px; height: 7px; background: #567e42; border: 2px solid white; border-radius: 50%; right: -1px; bottom: 0; }
  main { max-width: 1560px; margin: 0 auto; padding: 36px 44px 0; outline: none; }
  .page-heading { display: flex; align-items: end; justify-content: space-between; gap: 25px; margin-bottom: 27px; }
  .eyebrow { color: #6c7a66; font-size: 9px; font-weight: 600; letter-spacing: 1.8px; margin: 0 0 7px; }
  h1 { font-family: Georgia, 'Times New Roman', serif; font-weight: 400; font-size: clamp(24px, 2.4vw, 35px); letter-spacing: -1px; line-height: 1.2; margin: 0; }
  .edition { display: flex; align-items: center; gap: 8px; font-size: 7px; color: #788171; letter-spacing: 1px; white-space: nowrap; padding-bottom: 4px; }
  .edition > span { color: #9aa58f; }
  .edition-line { height: 1px; width: 18px; background: #c7cfbe; margin: 0 5px; }
  .announcement:empty { display: none; }
  .announcement { background: #eaf2e6; color: #295c35; border: 1px solid #d0dfc8; padding: 11px 15px; margin-bottom: 18px; border-radius: 6px; font-size: 12px; }
  .error-banner { padding: 13px 17px; border: 1px solid #d5ada2; background: #fff0eb; color: #7b3426; margin-bottom: 18px; display: flex; gap: 16px; justify-content: space-between; align-items: center; }
  .error-banner p { margin: 0; }
  .error-banner button { background: none; border: 1px solid currentColor; border-radius: 4px; padding: 5px 10px; white-space: nowrap; }
  .hero { background: #193f38; min-height: 375px; border-radius: 9px; overflow: hidden; position: relative; display: grid; grid-template-columns: 1.05fr 1fr; color: #faf6e9; }
  .hero::before { content: ''; position: absolute; inset: 0; opacity: .2; background: radial-gradient(ellipse at 70% 30%, #789372 0, transparent 70%); pointer-events: none; }
  .hero-content { position: relative; z-index: 2; padding: 38px 0 31px 38px; }
  .hero-kicker { display: flex; gap: 8px; align-items: center; font-size: 8px; letter-spacing: 1.8px; color: #cbdbc0; }
  .hero-kicker > span { border: 1px solid #b0ca9f; width: 5px; height: 5px; border-radius: 50%; }
  .hero h2 { font-family: Georgia, serif; font-size: clamp(32px, 3.6vw, 53px); line-height: 1.08; letter-spacing: -1.8px; font-weight: 400; margin: 22px 0 16px; }
  .hero h2 em { color: #dcdbb6; font-weight: 400; }
  .hero-content > p { font-size: 11px; line-height: 1.9; color: #d5dfd1; margin: 0 0 22px; }
  .primary-button { display: inline-flex; align-items: center; justify-content: center; gap: 9px; padding: 12px 18px; background: #e7e9c5; color: #243d2e; font-size: 11px !important; font-weight: 600 !important; border: 0; border-radius: 4px; min-height: 42px; }
  .primary-button:hover:not(:disabled) { background: #f0f2d6; }
  .primary-button:disabled { background: #c8d2b5; }
  .hero-footnote { display: block; font-size: 8px; letter-spacing: .4px; color: #c3d0bd; margin-top: 13px; }
  .hero-art { position: relative; min-width: 0; display: flex; align-items: center; justify-content: center; }
  .orbit { position: absolute; border: 1px solid #77947d35; border-radius: 50%; width: 480px; height: 480px; right: -100px; top: -65px; transform: rotate(-25deg); }
  .orbit-two { width: 610px; height: 610px; right: -170px; top: -130px; }
  .orbit-three { width: 740px; height: 740px; right: -240px; top: -195px; }
  .featured-cover { display: block; position: relative; z-index: 2; width: 235px; aspect-ratio: 1; border: 0; padding: 0; background: #afc2a6; box-shadow: -9px 15px 35px #001b2070; transform: rotate(-9deg) translate(-20px, -7px); transition: transform .3s; }
  .featured-cover:hover { transform: rotate(-5deg) translate(-20px, -10px); }
  .featured-cover img { width: 100%; height: 100%; object-fit: cover; }
  .vinyl { position: absolute; width: 225px; height: 225px; border-radius: 50%; transform: translate(67px, -8px); background: repeating-radial-gradient(circle at center, #171e1c 0 1px, #2a332d 2px 3px, #17251e 4px 5px); box-shadow: 8px 10px 20px #0c241e60; display: grid; place-items: center; }
  .vinyl > div { border-radius: 50%; width: 74px; height: 74px; background: #b6b888; box-shadow: inset 0 0 0 33px #c3bf88; border: 2px solid #b4b481; }
  .floating-note { position: absolute; z-index: 3; bottom: 64px; right: 18px; display: flex; align-items: center; gap: 10px; background: #f8f7eefa; border: 1px solid #fff8; border-radius: 5px; box-shadow: 0 8px 16px #0f271a30; color: #7b8170; font-size: 9px; padding: 12px 17px 12px 12px; transform: rotate(4deg); }
  .floating-note strong { color: #344b33; font-weight: 500; }
  .floating-icon { background: #e7eddf; padding: 7px; border-radius: 4px; color: #4d7143; }
  .hero-caption { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); white-space: nowrap; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; font-size: 7px; letter-spacing: 1px; color: #b8c9b4; }
  .hero-caption strong { font-size: 9px; color: #d6e0ca; font-weight: 400; letter-spacing: .3px; }
  .tiny-line { width: 16px; height: 1px; background: #b3c39e; }
  .discover-section { margin-top: 34px; }
  .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
  .section-heading h2 { font-family: Georgia, serif; font-size: clamp(20px, 2vw, 28px); font-weight: 400; letter-spacing: -.6px; line-height: 1.25; margin: 0; }
  .section-heading h2 em { color: #677e5d; }
  .selection-note { font-size: 9px; color: #7d8676; white-space: nowrap; }
  .selection-note span { font-size: 22px; display: inline-block; margin-left: 8px; }
  .selection-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 22px; }
  .chips { display: flex; gap: 6px; flex-wrap: wrap; }
  .chips button { border: 1px solid #dde3d7; background: #fff; border-radius: 5px; padding: 7px 13px; font-size: 10px; min-height: 34px; color: #68725f; }
  .chips button.chosen { background: #293e2f; border-color: #293e2f; color: #fff; }
  .chips button:hover:not(.chosen) { border-color: #809276; background: #f1f4ec; }
  .result-count { font-size: 9px; color: #7a8471; white-space: nowrap; }
  .album-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 19px; }
  .album-card { min-width: 0; }
  .cover-button { display: block; width: 100%; aspect-ratio: 1; border: 0; border-radius: 5px; background: #e4e9dc; padding: 0; overflow: hidden; position: relative; }
  .cover-button img { width: 100%; height: 100%; object-fit: cover; transition: transform .35s; }
  .cover-button:hover img { transform: scale(1.04); }
  .cover-overlay { position: absolute; inset: auto 0 0; padding: 12px 8px; background: linear-gradient(transparent, #142719d9); color: white; font-size: 10px; display: flex; align-items: center; justify-content: space-between; opacity: 0; transition: opacity .2s; }
  .cover-button:hover .cover-overlay, .cover-button:focus-visible .cover-overlay { opacity: 1; }
  .album-meta { display: flex; justify-content: space-between; gap: 6px; color: #7b8573; font-size: 8px; margin: 12px 0 5px; }
  .album-meta > span:first-child { text-transform: uppercase; letter-spacing: .9px; }
  .album-title-row { display: flex; align-items: start; gap: 4px; justify-content: space-between; }
  .album-title-row > div { min-width: 0; }
  .album-title-row h3 { font-size: 12px; font-weight: 600; letter-spacing: -.2px; line-height: 1.4; margin: 0 0 3px; overflow-wrap: anywhere; }
  .album-title-row p { font-size: 10px; color: #6e7765; margin: 0; }
  .save-button { display: flex; align-items: center; justify-content: center; border: 1px solid #dce3d5; border-radius: 50%; background: #fff; width: 30px; height: 30px; flex-shrink: 0; color: #596e4c; }
  .save-button:hover:not(:disabled) { color: #164d31; background: #e8f0df; }
  .save-button.saved { color: #386545; background: #e7efdf; border-color: #d5e2c8; }
  .album-note { color: #858c7d; font-family: Georgia, serif; font-style: italic; font-size: 10px; margin: 10px 0 0; line-height: 1.5; }
  .idea-banner { display: flex; gap: 20px; align-items: center; margin-top: 34px; padding: 25px; border: 1px solid #dce4d2; border-radius: 7px; background: #edf1e7; }
  .idea-icon { display: flex; align-items: center; justify-content: center; border: 1px solid #d5dec9; background: #e6ecdd; color: #5c754c; width: 56px; height: 56px; border-radius: 50%; flex-shrink: 0; }
  .idea-banner .eyebrow { font-size: 7px; letter-spacing: 1.4px; }
  .idea-banner h2 { font-family: Georgia, serif; font-size: 22px; font-weight: 400; line-height: 1.3; margin: 5px 0; letter-spacing: -.5px; }
  .idea-banner p { color: #768069; font-size: 10px; margin: 0; }
  .idea-banner > button { margin-left: auto; display: flex; align-items: center; gap: 12px; background: none; border: 0; font-size: 10px; color: #4f6944; white-space: nowrap; }
  .page-footer { margin: 28px 0 22px; display: flex; justify-content: space-between; gap: 15px; color: #808974; font-size: 8px; }
  .page-footer > span > span { margin: 0 6px; }
  .page-footer button { border: 0; padding: 0; background: none; font-size: 8px; display: flex; align-items: center; gap: 4px; color: #687b5d; }
  .listening-dock { position: fixed; bottom: 0; left: 228px; right: 0; z-index: 8; display: flex; align-items: center; gap: 15px; min-height: 76px; padding: 14px 44px; background: #fffffff5; backdrop-filter: blur(12px); border-top: 1px solid #dce3d4; }
  .dock-icon { display: grid; place-items: center; color: #5a724e; background: #eef2e8; border-radius: 5px; width: 43px; height: 43px; flex-shrink: 0; }
  .dock-copy { display: flex; flex-direction: column; gap: 4px; }
  .dock-copy strong { font-size: 11px; font-weight: 500; }
  .dock-copy > span { color: #79866e; font-size: 9px; }
  .listening-dock > button { margin-left: auto; border: 1px solid #dce3d5; background: white; border-radius: 4px; padding: 10px 13px; display: flex; align-items: center; gap: 15px; font-size: 10px; color: #3d5937; }
  .dock-brand { font-size: 7px; letter-spacing: 1px; color: #7d886e; border-left: 1px solid var(--line); padding: 10px 0 10px 22px; margin-left: 9px; white-space: nowrap; }
  .dock-brand > span { color: #abb69c; margin: 0 5px; }
  .library-summary { display: flex; gap: 22px; align-items: center; border: 1px solid #d7e0cf; border-radius: 8px; padding: 28px; background: #edf2e7; }
  .summary-symbol { width: 58px; height: 58px; border-radius: 50%; background: #dfe8d5; color: #4e6c40; display: grid; place-items: center; flex-shrink: 0; }
  .library-summary h2 { font-family: Georgia, serif; font-weight: 400; font-size: 27px; margin: 0 0 5px; letter-spacing: -.5px; }
  .library-summary p { color: #727f68; font-size: 11px; margin: 0; }
  .summary-stat { display: flex; flex-direction: column; align-items: center; padding-left: 25px; border-left: 1px solid #d3ddc8; min-width: 70px; }
  .summary-stat:first-of-type { margin-left: auto; }
  .library-summary > div:nth-child(3) { margin-left: auto; }
  .summary-stat strong { font-family: Georgia, serif; font-weight: 400; font-size: 30px; }
  .summary-stat > span { font-size: 10px; color: #75866a; white-space: nowrap; }
  .keeper-heading { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin: 28px 0 18px; }
  .keeper-heading a { font-size: 10px; color: #627955; display: inline-flex; align-items: center; gap: 6px; }
  .saved-list { display: flex; flex-direction: column; }
  .saved-row { border-top: 1px solid var(--line); padding: 19px 0; display: flex; align-items: center; gap: 21px; }
  .saved-row:last-child { border-bottom: 1px solid var(--line); }
  .saved-row > img { width: 78px; height: 78px; border-radius: 4px; object-fit: cover; background: #e7ecdf; }
  .saved-info { min-width: 0; }
  .saved-type { font-size: 8px; text-transform: uppercase; letter-spacing: 1px; color: #7b8a71; }
  .saved-type > span { padding: 0 4px; }
  .saved-info h3 { font-size: 15px; font-weight: 600; margin: 4px 0; overflow-wrap: anywhere; }
  .saved-info p { font-size: 11px; color: #78836d; margin: 0; }
  .status-label { margin-left: auto; display: inline-flex; gap: 6px; align-items: center; font-size: 9px; color: #7b7856; white-space: nowrap; padding: 5px 9px; background: #f0efdf; border-radius: 4px; }
  .status-label.listened { background: #e7efdf; color: #4a6f3b; }
  .status-dot { width: 4px; height: 4px; background: #9c9869; border-radius: 50%; }
  .saved-actions { display: flex; align-items: center; gap: 9px; }
  .listen-toggle { display: flex; align-items: center; gap: 7px; border: 1px solid #dce4d3; background: #fff; padding: 8px 11px; border-radius: 4px; color: #586d4a; font-size: 10px; min-height: 38px; }
  .icon-button { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 38px; color: #718462; background: none; border: 0; border-radius: 4px; }
  .icon-button:hover { background: #eaf0e2; }
  .remove-button:hover { color: #965647; background: #f5eae5; }
  .storage-note { color: #7b876f; font-size: 10px; display: flex; align-items: center; gap: 8px; margin: 24px 0; }
  .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 50px 15px; gap: 12px; color: #658053; }
  .empty-state h2, .empty-state h3 { font-family: Georgia, serif; font-size: 26px; font-weight: 400; color: #384b30; margin: 0; }
  .empty-state p { color: #7e8a71; font-size: 12px; max-width: 380px; margin: 0; }
  .empty-state button { display: flex; align-items: center; gap: 12px; border: 1px solid #cfdcc2; background: #edf2e5; color: #3a6030; padding: 10px 17px; border-radius: 4px; margin-top: 6px; font-size: 11px; }
  .concept-dialog { width: min(600px, calc(100% - 32px)); max-height: calc(100dvh - 40px); overflow-y: auto; padding: 40px; border: 1px solid #d9e1d2; border-radius: 10px; background: #fafbf6; color: #35432f; font: 13px/1.8 Arial, sans-serif; box-shadow: 0 30px 100px #0b231c55; }
  .concept-dialog::backdrop { background: #152b27a6; backdrop-filter: blur(4px); }
  .dialog-close { position: absolute; top: 14px; right: 14px; border: 0; padding: 7px; background: #e9eee1; border-radius: 50%; color: #5c714e; display: grid; place-items: center; }
  .dialog-eyebrow { display: block; font-size: 8px; letter-spacing: 1.8px; color: #718363; padding-right: 10px; }
  .dialog-brand { display: flex; gap: 9px; align-items: center; margin-top: 22px; font-size: 17px; }
  .dialog-brand > span { color: #98a98a; padding: 0 6px; }
  .concept-dialog h2 { font-family: Georgia, serif; font-size: 42px; letter-spacing: -1px; line-height: 1.15; font-weight: 400; margin: 24px 0 18px; }
  .concept-dialog p { color: #6d7c61; margin: 0 0 18px; }
  .about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-top: 20px; border-top: 1px solid #dce4d4; margin-top: 22px; }
  .about-grid strong { font-size: 12px; font-weight: 600; }
  .about-grid p { font-size: 11px; margin-top: 8px; }
  .about-disclosure { font-size: 10px; border-top: 1px solid #dce4d4; padding-top: 18px; }
  .about-links { display: flex; flex-wrap: wrap; gap: 12px 24px; }
  .about-links a, .detail-actions a { color: #3c6d3c; display: inline-flex; align-items: center; gap: 6px; font-size: 10px; text-decoration: none; }
  .detail-cover { width: 210px; height: 210px; object-fit: cover; display: block; border-radius: 4px; margin-bottom: 25px; box-shadow: 0 10px 30px #3f553522; }
  .album-dialog h2 { font-size: 35px; margin-bottom: 5px; }
  .album-dialog .detail-artist { color: #365b31; margin-bottom: 18px; }
  .detail-actions { display: flex; gap: 18px; flex-wrap: wrap; align-items: center; margin: 25px 0 12px; }
  .album-dialog .detail-disclaimer { font-size: 9px; margin: 0; }
  .album-dialog .dialog-error { color: #923b2a; font-size: 11px; margin-top: 12px; }
  @media (min-width: 1550px) { .hero { min-height: 440px; } .hero-content { padding: 50px; } .featured-cover { width: 290px; } .vinyl { width: 280px; height: 280px; transform: translate(90px, -8px); } .hero-art .floating-note { right: 45px; bottom: 75px; } .hero h2 { font-size: 62px; } .album-title-row h3 { font-size: 14px; } }
  @media (max-width: 1250px) { .edition { display: none; } .album-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 27px 22px; } .featured-cover { width: 205px; } .vinyl { width: 200px; height: 200px; transform: translate(40px, -10px); } .floating-note { right: 5px; font-size: 8px; padding: 10px; bottom: 62px; } .hero h2 { font-size: 41px; } .dock-brand { display: none; } .idea-banner { flex-wrap: wrap; } .idea-banner > button { margin-left: 76px; } .album-title-row h3 { font-size: 14px; } .album-title-row p { font-size: 11px; } .album-meta { font-size: 9px; } .album-note { font-size: 12px; } .save-button { width: 36px; height: 36px; } .library-summary { flex-wrap: wrap; } .library-summary > div:nth-child(3) { margin-left: 80px; } .status-label { display: none; } .saved-actions { margin-left: auto; } }
  @media (max-width: 1000px) { .sidebar { width: 190px; padding-left: 14px; padding-right: 14px; } .workspace { margin-left: 190px; } .listening-dock { left: 190px; padding: 14px 25px; } .topbar { padding: 0 25px; } main { padding: 30px 25px 0; } .breadcrumb { display: none; } .search-field { width: 100%; } .hero-content { padding-left: 25px; } .hero h2 { font-size: 36px; } .hero-art { margin-left: -15px; } .featured-cover { width: 165px; transform: rotate(-9deg) translate(-3px, -7px); } .featured-cover:hover { transform: rotate(-5deg) translate(-3px, -10px); } .vinyl { width: 160px; height: 160px; transform: translate(29px, -7px); } .floating-note { bottom: 80px; right: 1px; } .hero-caption { white-space: normal; width: 100%; } .selection-note { display: none; } .page-footer { flex-wrap: wrap; } .summary-stat { min-width: 64px; } .keeper-heading { align-items: start; flex-direction: column; } .listen-toggle > span { display: none; } .saved-row { gap: 12px; } .saved-actions { gap: 3px; } }
  @media (max-width: 720px) { .sidebar { position: sticky; top: 0; width: 100%; height: auto; padding: 12px 18px; flex-direction: row; justify-content: space-between; align-items: center; border-right: 0; border-bottom: 1px solid var(--line); gap: 12px; } .wordmark { margin: 0 0 6px; font-size: 25px; gap: 3px; } .wordmark svg { width: 23px; height: 28px; } .concept-tag { font-size: 5px; top: 32px; right: 0; letter-spacing: 1.5px; } .main-nav { flex-direction: row; gap: 4px; } .main-nav button { padding: 10px; font-size: 11px; gap: 6px; min-height: 43px; } .main-nav :global(svg) { width: 16px; height: 16px; } .nav-label, .sidebar-note, .sidebar-bottom, .nav-dot { display: none; } .nav-count { font-size: 8px; min-width: 16px; } .workspace { margin-left: 0; padding-bottom: 85px; } .topbar { height: 63px; padding: 0 20px; gap: 14px; } .search-field { padding: 9px 12px; } .search-hint { display: none; } .profile { flex-shrink: 0; } main { padding: 25px 20px 0; } .page-heading { margin-bottom: 22px; } .eyebrow { font-size: 8px; letter-spacing: 1.5px; } h1 { font-size: 29px; } .hero { grid-template-columns: 1fr 1fr; min-height: 335px; } .hero-content { padding: 28px 0 25px 24px; } .hero h2 { font-size: 33px; letter-spacing: -1px; } .hero-kicker { font-size: 7px; letter-spacing: 1px; } .hero-content > p { font-size: 10px; } .hero-footnote { font-size: 7px; } .featured-cover { width: 180px; } .vinyl { width: 180px; height: 180px; transform: translate(38px, -7px); } .floating-note { right: 8px; bottom: 59px; } .hero-caption { bottom: 19px; font-size: 6px; } .hero-caption strong { font-size: 7px; } .section-heading h2 { font-size: 25px; } .album-grid { gap: 24px 16px; } .album-title-row h3 { font-size: 12px; } .save-button { width: 30px; height: 30px; } .album-note { font-size: 11px; } .listening-dock { left: 0; padding: 12px 20px; gap: 10px; min-height: 78px; } .dock-copy strong { font-size: 10px; } .dock-copy > span { font-size: 8px; max-width: 185px; } .dock-icon { width: 35px; height: 35px; } .listening-dock > button { padding: 10px; gap: 7px; font-size: 9px; } .page-footer { font-size: 8px; } .library-summary h2 { font-size: 25px; } .summary-stat { padding-left: 20px; } }
  @media (max-width: 480px) { .sidebar { padding: 10px 14px; gap: 4px; } .main-nav button { font-size: 10px; padding: 9px 8px; } .main-nav button :global(svg) { width: 15px; } .wordmark { font-size: 23px; } .wordmark svg { width: 22px; } .concept-tag { top: 30px; } .topbar { padding: 0 16px; } main { padding: 24px 16px 0; } h1 { font-size: 27px; } .hero { display: flex; flex-direction: column; min-height: 0; } .hero-content { padding: 28px 25px 20px; } .hero h2 { font-size: 42px; margin-top: 20px; } .hero-content > p { font-size: 12px; } .hero-art { height: 230px; margin: 0; } .featured-cover { width: 183px; transform: rotate(-9deg) translate(-20px, -13px); } .featured-cover:hover { transform: rotate(-5deg) translate(-20px, -17px); } .vinyl { width: 180px; height: 180px; transform: translate(50px, -13px); } .floating-note { right: 22px; bottom: 39px; font-size: 9px; } .hero-caption { bottom: 14px; } .hero-caption strong { font-size: 8px; } .orbit { top: -150px; } .orbit-two { top: -215px; } .orbit-three { top: -280px; } .hero-footnote { font-size: 8px; } .section-heading h2 { font-size: 26px; } .section-heading h2 em { display: block; } .selection-toolbar { align-items: start; } .chips { gap: 5px; } .chips button { padding: 8px 10px; font-size: 9px; min-height: 36px; } .result-count { display: none; } .album-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px 15px; } .album-title-row h3 { font-size: 13px; } .album-title-row p { font-size: 11px; } .album-note { font-size: 11px; } .save-button { width: 32px; height: 32px; } .idea-banner { padding: 22px; gap: 14px; } .idea-icon { width: 42px; height: 42px; } .idea-banner > div:nth-child(2) { flex: 1; min-width: 170px; } .idea-banner h2 { font-size: 23px; } .idea-banner p { font-size: 11px; } .idea-banner > button { margin-left: 0; margin-top: 7px; font-size: 11px; } .page-footer { flex-direction: column; gap: 9px; margin-bottom: 22px; } .listening-dock { padding: 12px 16px; } .dock-icon { display: none; } .dock-copy { flex: 1; min-width: 0; } .dock-copy strong { font-size: 10px; } .dock-copy > span { font-size: 8px; max-width: 170px; } .listening-dock > button { font-size: 9px; padding: 10px; gap: 7px; flex-shrink: 0; } .library-summary { padding: 23px; gap: 16px; } .summary-symbol { display: none; } .library-summary > div:nth-child(2) { width: 100%; } .library-summary > div:nth-child(3) { margin-left: 0; } .summary-stat { padding-left: 0; padding-right: 24px; border-left: 0; border-right: 1px solid #d3ddc8; align-items: start; } .saved-row { gap: 11px; flex-wrap: wrap; } .saved-row > img { width: 60px; height: 60px; } .saved-info { width: calc(100% - 80px); } .saved-info h3 { font-size: 14px; } .saved-actions { margin-left: 71px; gap: 12px; } .listen-toggle > span { display: inline; } .saved-actions .icon-button { width: 40px; height: 40px; } .storage-note { font-size: 9px; align-items: start; } .concept-dialog { padding: 32px 25px; } .concept-dialog h2 { font-size: 35px; } .dialog-brand { font-size: 16px; } .about-grid { grid-template-columns: 1fr; gap: 0; } .empty-state h2 { font-size: 24px; } }
  @media (prefers-reduced-motion: reduce) { .featured-cover, .cover-button img, .cover-overlay { transition: none; } }
  /* Keep small secondary copy above WCAG AA contrast on every light surface. */
  .concept { --muted: #59664f; }
  .nav-label,
  .sidebar-note > span,
  .independent,
  .breadcrumb,
  .search-hint,
  .eyebrow,
  .edition,
  .selection-note,
  .result-count,
  .album-meta,
  .album-title-row p,
  .album-note,
  .idea-banner p,
  .page-footer,
  .page-footer button,
  .library-summary p,
  .summary-stat > span,
  .empty-state p,
  .storage-note,
  .dock-copy > span,
  .dock-brand,
  .saved-type,
  .saved-info p,
  .floating-note { color: var(--muted); }
  .search-field input::placeholder { color: var(--muted); opacity: 1; }
  .status-label { color: #645e3e; }
  .concept-dialog p,
  .dialog-eyebrow { color: #59664f; }
</style>
