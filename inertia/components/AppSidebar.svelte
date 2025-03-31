<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { ListMusic } from '@lucide/svelte'
  import type { ComponentProps } from 'svelte'
  import ProviderSwitcher from './ProviderSwitcher.svelte'
  import SidebarThemeSwitcher from './SidebarThemeSwitcher.svelte'
  import NavUser from './NavUser.svelte'

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()

  const data = {
    providers: [
      {
        name: 'Spotify',
        logo: '<i class="si si-spotify si--color text-2xl" />',
      },
    ],
    items: [
      {
        title: 'Playlists',
        url: '/library/playlists',
        icon: ListMusic,
      },
    ],
  }
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
  <Sidebar.Header>
    <ProviderSwitcher providers={data.providers} defaultProvider={data.providers[0]} />
  </Sidebar.Header>
  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupLabel>Library</Sidebar.GroupLabel>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each data.items as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton>
                {#snippet child({ props })}
                  <a href={item.url} {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
    <div class="mt-auto">
      <Sidebar.Group>
        <Sidebar.GroupContent>
          <Sidebar.Menu>
            <SidebarThemeSwitcher />
          </Sidebar.Menu>
        </Sidebar.GroupContent>
      </Sidebar.Group>
    </div>
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser />
  </Sidebar.Footer>
</Sidebar.Root>
