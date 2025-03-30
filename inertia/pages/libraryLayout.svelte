<script>
  import Navigation from '~/components/Navigation.svelte'
  import Layout from '~/layouts/layout.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import AppSidebar from '~/components/AppSidebar.svelte'
  let { children, data, title, description } = $props()
</script>

<Layout {title} {description}>
  <Sidebar.Provider>
    <AppSidebar />
    {#if data}
      {@render children()}
    {/if}
  </Sidebar.Provider>
</Layout>
