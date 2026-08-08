<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Check, X } from '@lucide/svelte'
  import { quintOut } from 'svelte/easing'
  import { fade, type TransitionConfig } from 'svelte/transition'

  let { hasBeenListened }: { hasBeenListened: boolean } = $props()

  /**
   * Read at call time, not at init: transitions only run in the browser, and a
   * preference captured once would miss the user changing it mid-session.
   *
   * Under `reduce` the icon still fades in. Only the spin and the scale go -
   * they are the movement, the opacity is the state change.
   */
  function iconSwap(node: Element, { direction }: { direction: number }): TransitionConfig {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return fade(node, { duration: 150, easing: quintOut })
    }
    return {
      duration: 150,
      easing: quintOut,
      css: (t) =>
        `opacity: ${t}; transform: scale(${0.6 + 0.4 * t}) rotate(${-90 * direction * (1 - t)}deg);`,
    }
  }
</script>

<Badge
  variant={hasBeenListened ? 'secondary' : 'outline'}
  class="gap-1 transition-colors duration-150 ease-out {hasBeenListened
    ? 'text-green-800 dark:text-green-400'
    : 'text-muted-foreground'}"
>
  <span class="inline-flex items-center gap-1">
    <span class="inline-flex size-3 shrink-0 items-center justify-center">
      {#key hasBeenListened}
        <!-- The transition has to sit on the keyed block's own child: Svelte does
             not play an intro for a block nested inside it. -->
        <span class="inline-flex" in:iconSwap={{ direction: hasBeenListened ? 1 : -1 }}>
          {#if hasBeenListened}
            <Check class="size-3" aria-hidden="true" />
          {:else}
            <X class="size-3" aria-hidden="true" />
          {/if}
        </span>
      {/key}
    </span>
    {#key hasBeenListened}
      <span in:fade={{ duration: 150, easing: quintOut }}
        >{hasBeenListened ? 'Listened' : 'Not listened'}</span
      >
    {/key}
  </span>
</Badge>