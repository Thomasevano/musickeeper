<script lang="ts">
  import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
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
  import DataTableActions from './data-table/data-table-actions.svelte'
  import DataTableStatusBadge from './data-table/data-table-status-badge.svelte'
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

  let statusFilter = $state<string>('all')

  const columns: ColumnDef<ListenLaterItem>[] = [
    {
      accessorKey: 'hasBeenListened',
      header: 'Status',
      enableHiding: false,
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
      cell: ({ row }) => row.original.itemType ?? '',
    },
    {
      accessorKey: 'title',
      header: 'Title',
    },
    {
      id: 'artists',
      header: 'Artists',
      cell: ({ row }) => row.original.artists?.join(', ') ?? '',
    },
    {
      accessorKey: 'albumName',
      header: 'Album',
      cell: ({ row }) => row.original.albumName ?? '-',
    },
    {
      id: 'actions',
      enableHiding: false,
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
  let columnVisibility = $state<VisibilityState>({})

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

  const statusFilterLabel = $derived(
    statusFilterOptions.find((o) => o.value === statusFilter)?.label ?? 'All'
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
            {column.id}
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
        {#each table.getRowModel().rows as row (row.id)}
          <Table.Row
            id={`item-${row.original.id}`}
            data-state={highlightedItemId === row.original.id ? 'highlighted' : undefined}
            class={highlightedItemId === row.original.id ? 'bg-warning/20' : ''}
          >
            {#each row.getVisibleCells() as cell (cell.id)}
              <Table.Cell>
                <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
              </Table.Cell>
            {/each}
          </Table.Row>
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
