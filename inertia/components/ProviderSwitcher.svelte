<script lang="ts">
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu'
  import * as Sidebar from '$lib/components/ui/sidebar'
  import { Check, ChevronsUpDown, GalleryVerticalEnd } from '@lucide/svelte'

  let {
    providers,
    defaultProvider,
  }: { providers: { name: string; logo: any }[]; defaultProvider: { name: string; logo: any } } =
    $props()

  let selectedProvider = $state(defaultProvider)
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
              class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
            >
              <GalleryVerticalEnd class="size-4" />
            </div>
            <div class="flex flex-col gap-0.5 leading-none">
              <span class="font-semibold">{selectedProvider.name}</span>
            </div>
            <ChevronsUpDown class="ml-auto" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content class="w-[var(--bits-dropdown-menu-anchor-width)]" align="start">
        {#each providers as provider (provider)}
          <DropdownMenu.Item onSelect={() => (selectedProvider.name = provider.name)}>
            {provider.name}
            {#if provider.name === selectedProvider.name}
              <Check class="ml-auto" />
            {/if}
          </DropdownMenu.Item>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
