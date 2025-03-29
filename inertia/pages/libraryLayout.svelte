<script>
  import Navigation from '~/components/Navigation.svelte'
  import Layout from '~/layouts/layout.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import AppSidebar from '~/components/AppSidebar.svelte'
  let { children, data, title, description } = $props()
</script>

<Layout {title} {description}>
  <Navigation />
  <Sidebar.Provider>
    <AppSidebar />
    <main>
      <Sidebar.Trigger />
      {#if data}
        <div class="grid lg:grid-cols-8">
          {@render children()}
        </div>
      {/if}
    </main>
  </Sidebar.Provider>
</Layout>
