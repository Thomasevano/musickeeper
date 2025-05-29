<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { useSidebar } from '$lib/components/ui/sidebar'
  import { Check, ChevronsUpDown } from '@lucide/svelte'
  import Badge from '~/lib/components/ui/badge/badge.svelte'

  let {
    providers,
    defaultProvider,
    user,
  }: { providers: { name: string; logo: any }[]; defaultProvider: { name: string; logo: any } } =
    $props()
  let selectedProvider = $state(defaultProvider)
  const sidebar = useSidebar()
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            {...props}
          >
            <div
              class="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
            >
              <i class={`si ${selectedProvider.logo} si--color text-2xl`}></i>
            </div>
            <span class="sr-only">Select Provider</span>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold">{selectedProvider.name}</span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-(--bits-dropdown-menu-anchor-width) min-w-56 rounded-lg"
        align="start"
        side={sidebar.isMobile ? 'bottom' : 'right'}
        sideOffset={4}
      >
        <DropdownMenu.Label class="text-muted-foreground text-xs"
          >Music Providers</DropdownMenu.Label
        >
        {#each providers as provider}
          <DropdownMenu.Item
            onSelect={() => (
              (selectedProvider.name = provider.name), (selectedProvider.logo = provider.logo)
            )}
            class="gap-2 p-2"
          >
            <i class={`si ${provider.logo} si--color text-2xl`}></i>
            {provider.name}
            {#if user.providers.includes(provider.name.toLowerCase())}
              <Badge variant="secondary" class="ml-2 text-xs">connected</Badge>
            {/if}
            {#if provider.name === selectedProvider.name}
              <Check class="ml-auto" />
            {/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
