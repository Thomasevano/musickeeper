<script>
  import Navigation from '~/components/Navigation.svelte'
  import Layout from '~/layouts/layout.svelte'
  let { children, data, title, description } = $props()
</script>

<Layout {title} {description}>
  <Navigation />
  {#if data}
    <div class="grid lg:grid-cols-8">
      {@render children()}
    </div>
  {/if}
</Layout>
