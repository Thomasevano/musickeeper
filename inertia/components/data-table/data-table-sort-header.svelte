<script lang="ts">
  import ArrowUpDownIcon from '@lucide/svelte/icons/arrow-up-down'
  import ArrowUpIcon from '@lucide/svelte/icons/arrow-up'
  import ArrowDownIcon from '@lucide/svelte/icons/arrow-down'
  import { Button } from '$lib/components/ui/button/index.js'
  import type { Column } from '@tanstack/table-core'

  let {
    column,
    label,
  }: {
    column: Column<any, any>
    label: string
  } = $props()

  const sorted = $derived(column.getIsSorted())
</script>

<Button
  variant="ghost"
  class="cursor-pointer px-0 hover:bg-transparent"
  onclick={() => column.toggleSorting(sorted === 'asc')}
>
  {label}
  {#if sorted === 'asc'}
    <ArrowUpIcon class="ml-1 size-3.5" />
  {:else if sorted === 'desc'}
    <ArrowDownIcon class="ml-1 size-3.5" />
  {:else}
    <ArrowUpDownIcon class="ml-1 size-3.5 opacity-40" />
  {/if}
</Button>
