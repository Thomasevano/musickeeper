<script lang="ts">
  import LibraryLayout from '~/layouts/libraryLayout.svelte'
  import { writable, type Writable } from 'svelte/store'
  import { onMount } from 'svelte'
  import { loadMore } from '$helpers'
  import AlbumCard from '../components/AlbumCard.svelte'
  import { InferPageProps } from '@adonisjs/inertia/types'
  import PlaylistsController from '../../src/infrastructure/http/controllers/playlists_controller'

  let {
    spotifyUserPlaylistsInfos,
  }: {
    spotifyUserPlaylistsInfos: InferPageProps<
      PlaylistsController,
      'index'
    >['spotifyUserPlaylistsInfos']
  } = $props()

  const paginatedUserPlaylistsInfos: Writable<
    InferPageProps<PlaylistsController, 'index'>['spotifyUserPlaylistsInfos']
  > = writable(spotifyUserPlaylistsInfos)

  let loadingRef: HTMLElement | undefined = $state()
  onMount(async () => {
    if (!loadingRef) {
      return
    }

    const loadingObserver = new IntersectionObserver((entries) => {
      const element = entries[0]

      if (element.isIntersecting) {
        ;(async function () {
          const morePlaylistsInfos = await loadMore($paginatedUserPlaylistsInfos, 'playlists')
          paginatedUserPlaylistsInfos.set({
            ...morePlaylistsInfos.nextSpotifyUserPlaylistsInfos,
            playlistsInfos: [
              ...$paginatedUserPlaylistsInfos.playlistsInfos,
              ...morePlaylistsInfos.nextSpotifyUserPlaylistsInfos.playlistsInfos,
            ],
          })
        })()
      }
    })

    loadingObserver.observe(loadingRef)
  })
</script>

<LibraryLayout data={$paginatedUserPlaylistsInfos} title="Playlists">
  {#if $paginatedUserPlaylistsInfos.playlistsInfos.length > 0}
    {#each $paginatedUserPlaylistsInfos.playlistsInfos as playlistInfos}
      <AlbumCard tracksListInfos={playlistInfos} aspectRatio="square" />
    {/each}
  {:else}
    <p>No Playlists Yet!</p>
  {/if}
  {#if $paginatedUserPlaylistsInfos.nextUrl}
    <div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
  {/if}
</LibraryLayout>
