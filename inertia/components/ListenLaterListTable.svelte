<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
  import DataTableSortHeader from './data-table/data-table-sort-header.svelte'
  import {
    type ColumnDef,
    type ColumnFiltersState,
    type PaginationState,
    type SortingState,
    type VisibilityState,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
  } from '@tanstack/table-core'
  import { fly } from 'svelte/transition'
  import { cubicOut, cubicIn } from 'svelte/easing'
  import DataTableActions from './data-table/data-table-actions.svelte'
  import DataTableStatusBadge from './data-table/data-table-status-badge.svelte'
  import DataTableTypeBadge from './data-table/data-table-type-badge.svelte'
  import DataTableTitleCell from './data-table/data-table-title-cell.svelte'
  import DataTableLinksCell from './data-table/data-table-links-cell.svelte'
  import CoverArt from './CoverArt.svelte'
  import * as Table from '$lib/components/ui/table/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import * as Select from '$lib/components/ui/select/index.js'
  import {
    FlexRender,
    createSvelteTable,
    renderComponent,
  } from '$lib/components/ui/data-table/index.js'
  import type { ListenLaterItem } from '../../src/domain/music_item'

  /**
   * Custom transition that collapses height on exit so the table reflows
   * smoothly instead of leaving a blank gap.
   *
   * Enter: fade + slide down from -6px  (ease-out, 250ms)
   * Exit:  fade + slide right + height collapse (ease-in, 200ms — slightly
   *        faster than entrance per web-animation-design guidelines)
   *
   * Both transitions are disabled when the user prefers reduced motion.
   */
  function rowIn(node: Element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return { duration: 0 }
    }
    return fly(node, { y: -6, opacity: 0, duration: 250, easing: cubicOut })
  }

  function rowOut(node: Element) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return { duration: 0 }
    }
    const height = (node as HTMLElement).offsetHeight
    return {
      duration: 200,
      easing: cubicIn,
      css: (t: number) => `
        opacity: ${t};
        transform: translateX(${(1 - t) * 14}px);
        height: ${t * height}px;
        overflow: hidden;
      `,
    }
  }

  let {
    items,
    onDelete,
    onToggleListen,
    highlightedItemId,
  }: {
    items: ListenLaterItem[]
    onDelete: (item: ListenLaterItem) => void
    onToggleListen: (item: ListenLaterItem) => void
    highlightedItemId: string | null
  } = $props()

  const statusFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'listened', label: 'Listened' },
    { value: 'not_listened', label: 'Not listened' },
  ]

  const typeFilterOptions = [
    { value: 'all', label: 'All' },
    { value: 'track', label: 'Tracks' },
    { value: 'album', label: 'Albums' },
  ]

  let statusFilter = $state<string>('all')
  let typeFilter = $state<string>('all')

  const columns: ColumnDef<ListenLaterItem>[] = [
    {
      accessorKey: 'hasBeenListened',
      header: 'Status',
      enableHiding: false,
      enableSorting: false,
      filterFn: (row, _columnId, filterValue) => {
        if (filterValue === 'all') return true
        if (filterValue === 'listened') return row.original.hasBeenListened === true
        if (filterValue === 'not_listened') return row.original.hasBeenListened === false
        return true
      },
      cell: ({ row }) =>
        renderComponent(DataTableStatusBadge, {
          hasBeenListened: row.original.hasBeenListened,
        }),
    },
    {
      id: 'cover',
      header: 'Cover',
      enableSorting: false,
      enableHiding: true,
      cell: ({ row }) =>
        renderComponent(CoverArt, {
          src: row.original.coverArt,
          alt: `Cover of ${row.original.title}`,
          size: 'sm',
          class: 'mx-auto',
        }),
    },
    {
      accessorKey: 'itemType',
      header: 'Type',
      enableSorting: false,
      filterFn: (row, _columnId, filterValue) => {
        if (filterValue === 'all') return true
        return row.original.itemType === filterValue
      },
      cell: ({ row }) =>
        renderComponent(DataTableTypeBadge, {
          type: row.original.itemType,
        }),
    },
    {
      accessorKey: 'title',
      header: ({ column }) => renderComponent(DataTableSortHeader, { column, label: 'Title' }),
      cell: ({ row }) =>
        renderComponent(DataTableTitleCell, {
          title: row.original.title,
          albumName: row.original.itemType === 'track' ? (row.original.albumName ?? null) : null,
        }),
    },
    {
      id: 'artists',
      header: ({ column }) => renderComponent(DataTableSortHeader, { column, label: 'Artists' }),
      accessorFn: (row) => row.artists?.join(', ') ?? '',
      cell: ({ row }) => row.original.artists?.join(', ') ?? '',
    },
    {
      accessorKey: 'addedAt',
      header: ({ column }) => renderComponent(DataTableSortHeader, { column, label: 'Added' }),
      sortingFn: (a, b) => {
        const aDate = a.original.addedAt instanceof Date ? a.original.addedAt.getTime() : Number(a.original.addedAt)
        const bDate = b.original.addedAt instanceof Date ? b.original.addedAt.getTime() : Number(b.original.addedAt)
        return aDate - bDate
      },
      cell: ({ row }) => {
        const d = row.original.addedAt
        if (!d) return '-'
        const date = d instanceof Date ? d : new Date(d)
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      },
    },
    {
      accessorKey: 'releaseDate',
      header: ({ column }) => renderComponent(DataTableSortHeader, { column, label: 'Released' }),
      enableHiding: true,
      sortingFn: (a, b) => {
        const aDate = a.original.releaseDate ? new Date(a.original.releaseDate).getTime() : 0
        const bDate = b.original.releaseDate ? new Date(b.original.releaseDate).getTime() : 0
        return aDate - bDate
      },
      cell: ({ row }) => {
        const d = row.original.releaseDate
        if (!d) return '-'
        const date = new Date(d)
        return isNaN(date.getTime()) ? '-' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
      },
    },
    {
      id: 'links',
      header: 'Links',
      enableHiding: true,
      enableSorting: false,
      cell: ({ row }) => renderComponent(DataTableLinksCell, { item: row.original }),
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) =>
        renderComponent(DataTableActions, {
          item: row.original,
          onDelete,
          onToggleListen,
        }),
    },
  ]

  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 })
  let sorting = $state<SortingState>([])
  let columnFilters = $state<ColumnFiltersState>([])
  let columnVisibility = $state<VisibilityState>({ releaseDate: false })

  const table = createSvelteTable({
    get data() {
      return items
    },
    columns,
    state: {
      get pagination() {
        return pagination
      },
      get sorting() {
        return sorting
      },
      get columnVisibility() {
        return columnVisibility
      },
      get columnFilters() {
        return columnFilters
      },
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        pagination = updater(pagination)
      } else {
        pagination = updater
      }
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        sorting = updater(sorting)
      } else {
        sorting = updater
      }
    },
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        columnFilters = updater(columnFilters)
      } else {
        columnFilters = updater
      }
    },
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        columnVisibility = updater(columnVisibility)
      } else {
        columnVisibility = updater
      }
    },
  })

  function handleStatusFilterChange(value: string) {
    statusFilter = value
    if (value === 'all') {
      table.getColumn('hasBeenListened')?.setFilterValue(undefined)
    } else {
      table.getColumn('hasBeenListened')?.setFilterValue(value)
    }
  }

  function handleTypeFilterChange(value: string) {
    typeFilter = value
    if (value === 'all') {
      table.getColumn('itemType')?.setFilterValue(undefined)
    } else {
      table.getColumn('itemType')?.setFilterValue(value)
    }
  }

  const columnLabels: Record<string, string> = {
    cover: 'Cover',
    itemType: 'Type',
    title: 'Title',
    artists: 'Artists',
    addedAt: 'Added',
    releaseDate: 'Released',
    links: 'Links',
  }

  const statusFilterLabel = $derived(
    statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? 'All'
  )

  const typeFilterLabel = $derived(
    typeFilterOptions.find((o) => o.value === typeFilter)?.label ?? 'All'
  )
</script>

<div class="w-full">
  <div class="flex items-center gap-2 py-4">
    <!-- Status filter -->
    <Select.Root type="single" value={statusFilter} onValueChange={handleStatusFilterChange}>
      <Select.Trigger class="w-[160px]">
        <span>Status: {statusFilterLabel}</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each statusFilterOptions as option (option.value)}
            <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>

    <!-- Type filter -->
    <Select.Root type="single" value={typeFilter} onValueChange={handleTypeFilterChange}>
      <Select.Trigger class="w-[150px]">
        <span>Type: {typeFilterLabel}</span>
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each typeFilterOptions as option (option.value)}
            <Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>

    <!-- Column visibility toggle -->
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" class="ml-auto">
            Columns <ChevronDownIcon class="ml-2 size-4" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">
        {#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
          <DropdownMenu.CheckboxItem
            class="capitalize"
            bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
          >
            {columnLabels[column.id] ?? column.id}
          </DropdownMenu.CheckboxItem>
        {/each}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </div>

  <div class="overflow-x-auto rounded-md border">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head>
                {#if !header.isPlaceholder}
                  <FlexRender
                    content={header.column.columnDef.header}
                    context={header.getContext()}
                  />
                {/if}
              </Table.Head>
            {/each}
          </Table.Row>
        {/each}
      </Table.Header>
      <Table.Body>
        {#each table.getRowModel().rows as row (row.original.id)}
          <tr
            id={`item-${row.original.id}`}
            data-slot="table-row"
            data-state={highlightedItemId === row.original.id ? 'highlighted' : undefined}
            class={[
              'hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
              highlightedItemId === row.original.id ? 'bg-warning/20' : '',
            ].join(' ')}
            in:rowIn
            out:rowOut
          >
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
              </Table.Cell>
            {/each}
          </tr>
        {:else}
          <Table.Row>
            <Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
          </Table.Row>
        {/each}
      </Table.Body>
    </Table.Root>
  </div>

  <div class="flex items-center justify-end space-x-2 pt-4">
    <div class="text-muted-foreground flex-1 text-sm tabular-nums">
      {table.getFilteredRowModel().rows.length} item(s)
    </div>
    <div class="flex items-center gap-3">
      <span class="text-muted-foreground text-sm tabular-nums">
        Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
      </span>
      <div class="space-x-2">
        <Button
          variant="outline"
          size="sm"
          onclick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onclick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  </div>
</div>
