<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import type { HTMLSelectAttributes } from 'svelte/elements'
  import { cn } from '$lib/utils.js'
  import { controlHeights } from '../control_heights.js'

  /**
   * A native `<select>`, wearing the outline-button skin.
   *
   * The custom listbox this replaces was a `<button aria-haspopup="listbox">`
   * driving a portalled `role="listbox"`, and it could not say what it held: a
   * button takes no `aria-activedescendant`, so the option moving under the
   * arrow keys was never announced. The platform control carries its value, its
   * label and its options with it, and on a phone it opens the system picker.
   *
   * `class` dresses the wrapper, so a caller sizes the control the way it sized
   * the trigger before.
   */
  let {
    ref = $bindable(null),
    value = $bindable(),
    class: className,
    children,
    ...restProps
  }: HTMLSelectAttributes & { ref?: HTMLSelectElement | null } = $props()
</script>

<div class={cn('relative', className)}>
  <select
    bind:this={ref}
    bind:value
    data-slot="select"
    class={cn(
      'border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 dark:hover:bg-input/50 shadow-xs w-full appearance-none rounded-md border bg-transparent py-2 pl-3 pr-9 text-sm outline-none transition-[color,box-shadow] focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
      controlHeights.select
    )}
    {...restProps}
  >
    {@render children?.()}
  </select>
  <ChevronDownIcon
    class="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
    aria-hidden="true"
  />
</div>
