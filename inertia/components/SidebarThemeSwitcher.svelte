<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import { Sun, Moon, Ellipsis, Check } from '@lucide/svelte'

  import { setMode, resetMode, mode } from 'mode-watcher'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { useSidebar } from '$lib/components/ui/sidebar'
  const sidebar = useSidebar()
</script>

<DropdownMenu.Root>
  <Sidebar.MenuItem>
    <DropdownMenu.Trigger>
      {#snippet child({ props })}
        <Sidebar.MenuButton
          {...props}
          class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Sun class={$mode === 'dark' ? 'hidden' : ''} />
          <Moon class={$mode === 'light' ? 'hidden' : ''} />
          <span class="ml-2">Theme: {$mode}</span>
          <span class="sr-only">Toggle theme</span>
          <Ellipsis class="ml-auto" />
        </Sidebar.MenuButton>
      {/snippet}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content
      side={sidebar.isMobile ? 'bottom' : 'right'}
      align={sidebar.isMobile ? 'end' : 'start'}
      class="min-w-56 rounded-lg"
    >
      <DropdownMenu.Item onclick={() => setMode('light')}>
        Light
        {#if $mode === 'light'}
          <Check class="ml-auto" />
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => setMode('dark')}>
        Dark
        {#if $mode === 'dark'}
          <Check class="ml-auto" />
        {/if}
      </DropdownMenu.Item>
      <DropdownMenu.Item onclick={() => resetMode()}>System</DropdownMenu.Item>
    </DropdownMenu.Content>
  </Sidebar.MenuItem>
</DropdownMenu.Root>
