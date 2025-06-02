<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { ListMusic, ListEnd } from '@lucide/svelte'
  import type { ComponentProps } from 'svelte'
  import ProviderSwitcher from './ProviderSwitcher.svelte'
  import SidebarThemeSwitcher from './SidebarThemeSwitcher.svelte'
  import NavUser from './NavUser.svelte'
  import { page } from '@inertiajs/svelte'
  const user: { avatar: string; name: string; email: string; providers: string[] } =
    $page.props.user

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()

  const data = {
    providers: [
      {
        name: 'Spotify',
        logo: 'si-spotify',
      },
    ],
    items: [],
  }
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
  <Sidebar.Header>
    <ProviderSwitcher {user} providers={data.providers} defaultProvider={data.providers[0]} />
  </Sidebar.Header>
  <Sidebar.Content>
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
    <NavUser {user} />
  </Sidebar.Footer>
</Sidebar.Root>
