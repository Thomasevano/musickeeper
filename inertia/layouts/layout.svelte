<script lang="ts">
  import type { Snippet } from 'svelte'
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  import { Toaster } from '$lib/components/ui/sonner/index.js'

  let { children, title }: { children: Snippet; title?: string } = $props()
</script>

<svelte:head>
  {#if title}
    <title>{title} - MusicKeeper</title>
  {:else}
    <title>MusicKeeper</title>
  {/if}
</svelte:head>

<div class="flex min-h-dvh flex-col">
  <Navigation />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>

<Toaster />
