<script>
  import { page } from '@inertiajs/svelte'
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  let { children } = $props()
</script>

<svelte:head>
  {#if $page.props.title}
    <title>{$page.props.title} - MusicKeeper</title>
  {:else}
    <title>MusicKeeper</title>
  {/if}
  {#if $page.props.description}
    <meta name="description" content={$page.props.description} />
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
