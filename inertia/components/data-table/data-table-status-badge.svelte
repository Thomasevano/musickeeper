<script lang="ts">
  import { Badge } from '$lib/components/ui/badge/index.js'
  import { Check, X } from '@lucide/svelte'
  import { quintOut } from 'svelte/easing'
  import type { TransitionConfig } from 'svelte/transition'

  let { hasBeenListened }: { hasBeenListened: boolean } = $props()

  const prefersReducedMotion =
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false

  function iconSwap(
    _node: Element,
    { direction }: { direction: number }
  ): TransitionConfig {
    if (prefersReducedMotion) return { duration: 0 }
    return {
      duration: 150,
      easing: quintOut,
      css: (t) =>
        `opacity: ${t}; transform: scale(${0.6 + 0.4 * t}) rotate(${-90 * direction * (1 - t)}deg);`,
    }
  }

  function labelFade(_node: Element, _params: Record<string, never>): TransitionConfig {
    if (prefersReducedMotion) return { duration: 0 }
    return {
      duration: 150,
      easing: quintOut,
      css: (t) => `opacity: ${t};`,
    }
  }
</script>

<Badge
  variant={hasBeenListened ? 'secondary' : 'outline'}
  class="gap-1 transition-colors duration-150 ease-out {hasBeenListened ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}"
>
  <span class="inline-flex items-center gap-1">
    <span class="inline-flex size-3 shrink-0 items-center justify-center">
      {#key hasBeenListened}
        {#if hasBeenListened}
          <span class="inline-flex" in:iconSwap={{ direction: 1 }}>
            <Check class="size-3" />
          </span>
        {:else}
          <span class="inline-flex" in:iconSwap={{ direction: -1 }}>
            <X class="size-3" />
          </span>
        {/if}
      {/key}
    </span>
    {#key hasBeenListened}
      <span in:labelFade>{hasBeenListened ? 'Listened' : 'Not listened'}</span>
    {/key}
  </span>
</Badge>