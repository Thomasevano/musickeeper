<script lang="ts">
  import { IsMobile } from '$lib/components/hooks/is_mobile.svelte.js'
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js'
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte'
  import { ModeWatcher } from 'mode-watcher'
  import ToggleTheme from './ToggleTheme.svelte'

  const isMobile = new IsMobile()
</script>

<NavigationMenu.Root
  viewport={isMobile.current}
  class="mx-auto w-full max-w-7xl px-8 flex flex-0 py-5 justify-between items-center md:px-12 lg:px-16"
>
  <ModeWatcher />
  <a href="/" class="font-display font-bold flex items-center gap-2">
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      aria-hidden="true">
      <path d="M19 21l-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
      <g transform="translate(7.4, 5.2) scale(0.4)">
        <circle cx="8" cy="18" r="4" vector-effect="non-scaling-stroke"/>
        <path d="M12 18V2l7 4"    vector-effect="non-scaling-stroke"/>
      </g>
    </svg>
    MusicKeeper
  </a>
  <NavigationMenu.List class="flex-wrap">
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="/#features" class={navigationMenuTriggerStyle()}>Features</a>
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
    <NavigationMenu.Item>
      <NavigationMenu.Link>
        {#snippet child()}
          <a href="https://thomasevano.fr/en/tags/musickeeper/" class={navigationMenuTriggerStyle()}
            rel="noopener noreferrer" target="_blank">Blog<span class="sr-only"> (opens in new tab)</span></a
          >
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  </NavigationMenu.List>
  <ToggleTheme />
</NavigationMenu.Root>
