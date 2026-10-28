<script lang="ts">
  import type { Snippet } from 'svelte'
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  import UpdateBanner from '~/components/UpdateBanner.svelte'

  let { children, title }: { children: Snippet; title?: string } = $props()
</script>

<svelte:head>
  {#if title}
    <title>{title} - MusicKeeper</title>
  {:else}
    <title>MusicKeeper</title>
  {/if}
</svelte:head>

<div class="flex min-h-dvh flex-col pt-[env(safe-area-inset-top)] pe-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] ps-[env(safe-area-inset-left)]">
  <Navigation />
  <UpdateBanner />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>

<Toaster />
