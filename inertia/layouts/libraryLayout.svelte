<script>
  import Navigation from '~/components/Navigation.svelte'
  import Layout from './layout.svelte'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import AppSidebar from '~/components/AppSidebar.svelte'
  import * as Tooltip from '~/lib/components/ui/tooltip'
  import { Button } from '~/lib/components/ui/button'
  import { Separator } from '~/lib/components/ui/separator'

  let { children, data, title, description } = $props()
</script>

<Layout>
  <Sidebar.Provider>
    <AppSidebar />
    {#if data}
      <div class="h-full w-full px-4 py-6 lg:px-8">
        <div class="flex flex-col justify-between md:flex-row">
          <div class="flex flex-row">
            <Sidebar.Trigger class="mr-2" />
            <div class="mb-4 space-y-2 md:mb-0">
              <h2 class="text-2xl font-semibold tracking-tight">{title}</h2>
              <p class="text-muted-foreground text-sm">
                Extract your Spotify {title.toLowerCase()} as text files
              </p>
            </div>
          </div>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger>
                <Button href={`playlists/archive`} target="_blank" class="relative">
                  Extract all {data.total}
                  {title}
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>
                <p>Extract all {title}</p>
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
        <Separator class="my-4" />
        <div class="grid grid-cols-auto gap-2">
          {@render children()}
        </div>
      </div>
    {/if}
  </Sidebar.Provider>
</Layout>
