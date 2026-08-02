<script lang="ts">
  import MenuIcon from '@lucide/svelte/icons/menu'
  import { IsMobile } from '$lib/components/hooks/is_mobile.svelte.js'
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js'
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte'
  import * as Sheet from '$lib/components/ui/sheet/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import { controlHeights } from '$lib/components/ui/control_heights.js'
  import { ModeWatcher } from 'mode-watcher'
  import ToggleTheme from './ToggleTheme.svelte'

  const isMobile = new IsMobile()
  const navigationLinks = [
    { href: '/#features', label: 'Features', external: false },
    {
      href: 'https://thomasevano.fr/en/tags/musickeeper/',
      label: 'Blog',
      external: true,
    },
  ] as const
  let mobileNavOpen = $state(false)

  $effect(() => {
    if (!isMobile.current) mobileNavOpen = false
  })
</script>

{#snippet navigationLink(
  link: (typeof navigationLinks)[number],
  className: string,
  onclick: (() => void) | undefined
)}
  <a
    href={link.href}
    class={className}
    rel={link.external ? 'noopener noreferrer' : undefined}
    target={link.external ? '_blank' : undefined}
    {onclick}
  >
    {link.label}
    {#if link.external}<span class="sr-only"> (opens in new tab)</span>{/if}
  </a>
{/snippet}

<NavigationMenu.Root
  viewport={isMobile.current}
  class="mx-auto flex w-full max-w-screen-2xl flex-0 items-center justify-between px-8 py-5 md:px-12 lg:px-16"
>
  <ModeWatcher />
  <a
    href="/"
    class={`flex items-center gap-2 font-display font-bold ${controlHeights.menuItem}`}
    aria-label="MusicKeeper home"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      <g transform="translate(7.4, 5.2) scale(0.4)" stroke-width="3.5">
        <circle cx="8" cy="18" r="3"/>
        <path d="M12 18V2l7 4"/>
      </g>
    </svg>
    MusicKeeper
  </a>

  <NavigationMenu.List class="hidden md:flex">
    {#each navigationLinks as link (link.href)}
      <NavigationMenu.Item>
        <NavigationMenu.Link>
          {#snippet child()}
            {@render navigationLink(link, navigationMenuTriggerStyle(), undefined)}
          {/snippet}
        </NavigationMenu.Link>
      </NavigationMenu.Item>
    {/each}
  </NavigationMenu.List>

  <div class="hidden md:block">
    <ToggleTheme />
  </div>

  <Sheet.Root bind:open={mobileNavOpen}>
    <Sheet.Trigger class="md:hidden">
      {#snippet child({ props })}
        <Button {...props} variant="outline" size="icon" class="md:hidden" aria-label="Open navigation">
          <MenuIcon class="size-5" aria-hidden="true" />
        </Button>
      {/snippet}
    </Sheet.Trigger>
    <Sheet.Content side="right" class="w-[min(20rem,calc(100%-1rem))]">
      <Sheet.Header class="sr-only">
        <Sheet.Title>Navigation</Sheet.Title>
        <Sheet.Description>Site links and theme settings.</Sheet.Description>
      </Sheet.Header>
      <nav class="flex flex-col gap-2 px-2 pt-4" aria-label="Mobile navigation">
        {#each navigationLinks as link (link.href)}
          {@render navigationLink(
            link,
            'flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-muted',
            () => (mobileNavOpen = false)
          )}
        {/each}
        <div class="pt-2">
          <ToggleTheme />
        </div>
      </nav>
    </Sheet.Content>
  </Sheet.Root>
</NavigationMenu.Root>
