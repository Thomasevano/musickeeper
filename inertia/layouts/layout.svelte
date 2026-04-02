<script>
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  import { Toaster } from '$lib/components/ui/sonner/index.js'
  let { children } = $props()
</script>

<div class="flex min-h-dvh flex-col">
  <Navigation />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>

<Toaster />
