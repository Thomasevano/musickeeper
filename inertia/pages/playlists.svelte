<script lang="ts">
  import LibraryLayout from './libraryLayout.svelte'
  import { writable, type Writable } from 'svelte/store'
  import { onMount } from 'svelte'
  import { loadMorePlaylistsInfos } from '$helpers'
  import type { PaginatedPlaylistsInfos } from '../../src/domain/playlist'
  import { Separator } from '~/lib/components/ui/separator'
  import AlbumCard from '../components/AlbumCard.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar'

  let { spotifyUserPlaylistsInfos } = $props()

  const paginatedUserPlaylistsInfos: Writable<PaginatedPlaylistsInfos> =
    writable(spotifyUserPlaylistsInfos)

  let loadingRef: HTMLElement | undefined = $state()
  onMount(async () => {
    if (!loadingRef) {
      return
    }

    const loadingObserver = new IntersectionObserver((entries) => {
      const element = entries[0]

      if (element.isIntersecting) {
        ;(async function () {
          loadMorePlaylistsInfos(paginatedUserPlaylistsInfos, $paginatedUserPlaylistsInfos)
        })()
      }
    })

    loadingObserver.observe(loadingRef)
  })
</script>

<LibraryLayout data={$paginatedUserPlaylistsInfos}>
  <div class="h-full w-full px-4 py-6 lg:px-8">
    <div class="flex flex-col justify-between md:flex-row">
      <div class="flex flex-row">
        <Sidebar.Trigger class="mr-2" />
        <div class="mb-4 space-y-2 md:mb-0">
          <h2 class="text-2xl font-semibold tracking-tight">Playlists</h2>
          <p class="text-muted-foreground text-sm">
            All your Spotify playlists are available here.
          </p>
        </div>
      </div>
    </div>
    <Separator class="my-4" />
    <div class="grid grid-cols-auto gap-2">
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
    </div>
  </div>
</LibraryLayout>
