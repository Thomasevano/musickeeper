<script>
  import Footer from '$components/Footer.svelte'
  import Navigation from '~/components/Navigation.svelte'
  let { children } = $props()
</script>

<div class="flex min-h-screen flex-col">
  <Navigation />
  <main class="flex-1">
    {@render children()}
  </main>
  <Footer />
</div>
