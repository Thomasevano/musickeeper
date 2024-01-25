<script lang="ts">
  import { code, getAccessToken, redirectToAuthCodeFlow } from "./services/spotify_auth_service";
  import { Button } from "$lib/components/ui/button";
  import {
    fetchProfile,
    fetchUserSavedAlbums,
    fetchUserPlaylists,
  } from "./services/spotify_fetch_infos_service";
  import { spotifyUserPlaylists } from "./lib/store";
  import { Download } from "lucide-svelte";
  import { Separator } from "$lib/components/ui/separator";
  import * as Tabs from "$lib/components/ui/tabs";
  import AlbumCard from "$lib/components/AlbumCard.svelte";
  import Menu from "$lib/components/Menu.svelte";
  import Sidebar from "./lib/components/Sidebar.svelte";
  import { onMount } from "svelte";

  const spotifyAccessToken = localStorage.getItem("spotify_access_token");
  const spotifyRefreshToken = localStorage.getItem("spotify_refresh_token");

  if (!spotifyAccessToken && !spotifyRefreshToken && code) {
    getAccessToken(code);
  }

  let userPlaylistsPromise;
  let isMorePlaylist = true;
  let url;
  const getUserPlaylist = async () => {
    if ($spotifyUserPlaylists.length === 0) {
      userPlaylistsPromise = await fetchUserPlaylists({
        token: spotifyAccessToken,
      });
      spotifyUserPlaylists.set(userPlaylistsPromise.items);
      url = userPlaylistsPromise.next;
    } else {
      const playlists = await fetchUserPlaylists({
        token: spotifyAccessToken,
        url,
      });
      url = playlists.next;
      if (url === null) {
        isMorePlaylist = false;
      }
      spotifyUserPlaylists.set([...$spotifyUserPlaylists, ...playlists.items]);
    }
  };

  let loadingRef: HTMLElement | undefined;
  onMount(async () => {
    if (!loadingRef) {
      return;
    }

    const loadingObserver = new IntersectionObserver((entries) => {
      const element = entries[0];

      if (element.isIntersecting) {
        (async function () {
          await getUserPlaylist();
        })();
      }
    });

    loadingObserver.observe(loadingRef);
  });
</script>

{#if !spotifyAccessToken}
  <Button
    on:click={async () => {
      await redirectToAuthCodeFlow();
    }}>Login with Spotify</Button
  >
{/if}
{#if spotifyAccessToken}
  <div class="md:hidden">
    <img
      src="/examples/music-light.png"
      width={1280}
      height={1114}
      alt="Music"
      class="block dark:hidden"
    />
    <img
      src="/examples/music-dark.png"
      width={1280}
      height={1114}
      alt="Music"
      class="hidden dark:block"
    />
  </div>
  <div class="hidden md:block">
    <Menu />
    <div class="border-t">
      <div class="bg-background">
        <div class="grid lg:grid-cols-5">
          <Sidebar class="hidden lg:block" />
          <div class="col-span-3 lg:col-span-4 lg:border-l">
            <div class="h-full px-4 py-6 lg:px-8">
              <div class="space-between flex items-center">
                <div class="ml-auto mr-4">
                  <Button>
                    <Download class="mr-2 h-4 w-4" />
                    Télécharger toutes les playlists
                  </Button>
                </div>
              </div>
              <div class="flex items-center justify-between">
                <div class="space-y-1">
                  <h2 class="text-2xl font-semibold tracking-tight">
                    Vos Playlists
                  </h2>
                  <p class="text-sm text-muted-foreground">
                    Extrayez le contenu de votre librairie musicale sous forme
                    textuel
                  </p>
                </div>
              </div>
              <Separator class="my-4" />
              <div class="relative">
                <div class="overflow-x-auto">
                  <div class="flex flex-wrap space-x-4 pb-4">
                    {#each $spotifyUserPlaylists as album}
                      <AlbumCard
                        {album}
                        class="w-[150px]"
                        aspectRatio="square"
                        width={150}
                        height={150}
                      />
                    {/each}
                  </div>
                </div>
              </div>
              {#if isMorePlaylist}
                <div class="loading-indicator" bind:this={loadingRef}>
                  Loading...
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
</style>
