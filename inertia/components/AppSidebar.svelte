<script lang="ts">
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { ListMusic, ListEnd } from '@lucide/svelte'
  import type { ComponentProps } from 'svelte'
  import SidebarThemeSwitcher from './SidebarThemeSwitcher.svelte'

  let {
    ref = $bindable(null),
    collapsible = 'icon',
    ...restProps
  }: ComponentProps<typeof Sidebar.Root> = $props()
</script>

<Sidebar.Root bind:ref {collapsible} {...restProps}>
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
</Sidebar.Root>
