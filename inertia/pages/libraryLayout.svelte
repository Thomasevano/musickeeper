<script>
  import Layout from '~/layouts/layout.svelte'
  let { children, data, title, description } = $props()
</script>

<Layout {title} {description}>
  {#if data}
    {@render children()}
  {/if}
</Layout>
