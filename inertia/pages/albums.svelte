<script lang="ts">
  import LibraryLayout from '~/layouts/libraryLayout.svelte'
  import { writable, type Writable } from 'svelte/store'
  import { onMount } from 'svelte'
  import { loadMore } from '$helpers'
  import AlbumCard from '../components/AlbumCard.svelte'

  import { InferPageProps } from '@adonisjs/inertia/types'
  import AlbumsController from '../../src/infrastructure/http/controllers/albums_controller'

  let {
    spotifyAlbumsInfos,
  }: { spotifyAlbumsInfos: InferPageProps<AlbumsController, 'index'>['spotifyAlbumsInfos'] } =
    $props()

  const paginatedUserAlbumsInfos: Writable<
    InferPageProps<AlbumsController, 'index'>['spotifyAlbumsInfos']
  > = writable(spotifyAlbumsInfos)

  let loadingRef: HTMLElement | undefined = $state()
  onMount(async () => {
    if (!loadingRef) {
      return
    }

    const loadingObserver = new IntersectionObserver((entries) => {
      const element = entries[0]

      if (element.isIntersecting) {
        ;(async function () {
          const moreAlbumsInfos = await loadMore($paginatedUserAlbumsInfos, 'albums')
          console.log({ moreAlbumsInfos })
          paginatedUserAlbumsInfos.set({
            ...moreAlbumsInfos.spotifyAlbumsInfos,
            albumsInfos: [
              ...$paginatedUserAlbumsInfos.albumsInfos,
              ...moreAlbumsInfos.spotifyAlbumsInfos.albumsInfos,
            ],
          })
        })()
      }
    })

    loadingObserver.observe(loadingRef)
  })
</script>

<LibraryLayout data={$paginatedUserAlbumsInfos} title="Albums">
  {#if $paginatedUserAlbumsInfos.albumsInfos.length > 0}
    {#each $paginatedUserAlbumsInfos.albumsInfos as albumsInfos}
      <AlbumCard tracksListInfos={albumsInfos} aspectRatio="square" />
    {/each}
  {:else}
    <p>No albums Yet!</p>
  {/if}
  {#if $paginatedUserAlbumsInfos.nextUrl}
    <div class="loading-indicator" bind:this={loadingRef}>Loading...</div>
  {/if}
</LibraryLayout>
