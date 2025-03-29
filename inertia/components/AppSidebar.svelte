<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { Music } from 'lucide-svelte'
  import type { ComponentProps } from 'svelte'
  import ProviderSwitcher from './ProviderSwitcher.svelte'
  import NavUser from './NavUser.svelte'

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()

  const data = {
    user: {
      name: 'tvn',
      email: 'm@example.com',
      avatar: '/avatars/shadcn.jpg',
    },
    providers: [
      {
        name: 'Spotify',
        logo: Music,
      },
    ],
    items: [
      {
        title: 'Playlists',
        url: '/library/playlists',
        icon: Music,
      },
    ],
  }
  // Menu items.
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
  </Sidebar.Content>
  <Sidebar.Footer>
    <NavUser user={data.user} />
  </Sidebar.Footer>
</Sidebar.Root>
