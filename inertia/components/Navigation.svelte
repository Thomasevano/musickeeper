<script lang="ts">
  import { IsMobile } from '$lib/components/hooks/is_mobile.svelte.js'
  import * as NavigationMenu from '$lib/components/ui/navigation-menu/index.js'
  import { navigationMenuTriggerStyle } from '$lib/components/ui/navigation-menu/navigation-menu-trigger.svelte'
  import ToggleTheme from './ToggleTheme.svelte'

  const isMobile = new IsMobile()
</script>

<NavigationMenu.Root
  viewport={isMobile.current}
  class="mx-auto w-full max-w-7xl px-8 flex py-5 justify-between items-center md:px-12 lg:px-16"
>
  <a href="/" class="font-display font-bold">MusicKeeper</a>
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
            >Blog</a
          >
        {/snippet}
      </NavigationMenu.Link>
    </NavigationMenu.Item>
  </NavigationMenu.List>
  <ToggleTheme />
</NavigationMenu.Root>
