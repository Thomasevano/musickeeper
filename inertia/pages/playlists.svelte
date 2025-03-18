<script lang="ts">
  import LibraryLayout from './libraryLayout.svelte'
  import { writable, type Writable } from 'svelte/store'
  import { onMount } from 'svelte'
  import { loadMorePlaylistsInfos } from '$helpers'
  import type { PaginatedPlaylistsInfos } from '../../src/domain/playlist'
  import * as Tooltip from '~/lib/components/ui/tooltip'
  import { Button } from '~/lib/components/ui/button'
  import { Separator } from '~/lib/components/ui/separator'
  import AlbumCard from '../components/AlbumCard.svelte'

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
  <div class="lg:col-span-7 lg:border-l">
    <div class="h-full px-4 py-6 lg:px-8">
      <div class="flex flex-col justify-between md:flex-row">
        <div class="mb-6 space-y-2 md:mb-0">
          <h2 class="text-2xl font-semibold tracking-tight">Playlists</h2>
          <p class="text-muted-foreground text-sm">Extract your Spotidy playlists as text files</p>
        </div>
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button href={`playlists/archive`} target="_blank" class="relative">
                Extract all {$paginatedUserPlaylistsInfos.total} playlists
              </Button>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Extract all playlists</p>
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      </div>
      <Separator class="my-4" />
      <div
        class="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7"
      >
        {#if $paginatedUserPlaylistsInfos.playlistsInfos.length > 0}
          {#each $paginatedUserPlaylistsInfos.playlistsInfos as playlistInfos}
            <AlbumCard tracksListInfos={playlistInfos} class="w-[180px]" aspectRatio="square" />
          {/each}
        {:else}
          <p>No Playlists Yet!</p>
        {/if}
        {#if $paginatedUserPlaylistsInfos.nextUrl}
          <div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
        {/if}
      </div>
    </div>
  </div>
</LibraryLayout>
