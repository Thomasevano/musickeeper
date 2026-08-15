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
  import { rowIn, rowOut } from './data-table/data_table_row_transitions.js'
  import DataTableActions from './data-table/data-table-actions.svelte'
  import DataTableStatusBadge from './data-table/data-table-status-badge.svelte'
  import DataTableTypeBadge from './data-table/data-table-type-badge.svelte'
  import DataTableTitleCell from './data-table/data-table-title-cell.svelte'
  import DataTableLinksCell from './data-table/data-table-links-cell.svelte'
  import CoverArt from './CoverArt.svelte'
  import * as Table from '$lib/components/ui/table/index.js'
  import { Button } from '$lib/components/ui/button/index.js'
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js'
  import { Select } from '$lib/components/ui/select/index.js'
  import {
    FlexRender,
    createSvelteTable,
    renderComponent,
  } from '$lib/components/ui/data-table/index.js'
  import type { ListenLaterItem } from '../../src/domain/music_item'
  type PendingListenLaterItem = ListenLaterItem & { externalLinksPending?: boolean }

  let {
    items,
    onDelete,
    onToggleListen,
    highlightedItemId,
  }: {
    items: PendingListenLaterItem[]
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

  type MobileSort = 'artists_desc' | 'artists_asc' | 'added_desc' | 'added_asc'

  const mobileSortOptions: { value: MobileSort; label: string; sorting: SortingState }[] = [
    { value: 'artists_desc', label: 'Artists (Z–A)', sorting: [{ id: 'artists', desc: true }] },
    { value: 'artists_asc', label: 'Artists (A–Z)', sorting: [{ id: 'artists', desc: false }] },
    { value: 'added_desc', label: 'Added (newest)', sorting: [{ id: 'addedAt', desc: true }] },
    { value: 'added_asc', label: 'Added (oldest)', sorting: [{ id: 'addedAt', desc: false }] },
  ]

  function formatDate(value: Date | number | string | null | undefined) {
    if (!value) return '-'
    const date = value instanceof Date ? value : new Date(value)
    return isNaN(date.getTime())
      ? '-'
      : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  }

  /**
   * A row's only tab stops are its links and its menu, and a link names its
   * platform and nothing else: "Spotify" never says which recording it streams,
   * and the status, type, artists and date live in cells Tab jumps straight
   * over. Every control in a row is described by this, so the row arrives with
   * the control that belongs to it.
   */
  function rowSummary(item: ListenLaterItem) {
    const album = item.itemType === 'track' && item.albumName ? ` from ${item.albumName}` : ''
    return [
      `${item.title}${album}`,
      `${item.itemType} by ${item.artists?.join(', ') || 'Unknown artist'}`,
      item.hasBeenListened ? 'listened' : 'not listened',
      `added ${formatDate(item.addedAt)}`,
    ].join(', ')
  }

  const columns: ColumnDef<PendingListenLaterItem>[] = [
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
      // The title is the row header, so hiding it would leave rows unidentifiable.
      enableHiding: false,
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
        const aDate =
          a.original.addedAt instanceof Date
            ? a.original.addedAt.getTime()
            : Number(a.original.addedAt)
        const bDate =
          b.original.addedAt instanceof Date
            ? b.original.addedAt.getTime()
            : Number(b.original.addedAt)
        return aDate - bDate
      },
      cell: ({ row }) => formatDate(row.original.addedAt),
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
      cell: ({ row }) => formatDate(row.original.releaseDate),
    },
    {
      id: 'links',
      header: 'Links',
      enableHiding: true,
      enableSorting: false,
      cell: ({ row }) =>
        renderComponent(DataTableLinksCell, {
          item: row.original,
          describedBy: `row-summary-${row.original.id}`,
        }),
    },
    {
      id: 'actions',
      enableHiding: false,
      enableSorting: false,
      cell: ({ row }) =>
        renderComponent(DataTableActions, {
          item: row.original,
          describedBy: `row-summary-${row.original.id}`,
          onDelete,
          onToggleListen,
        }),
    },
  ]

  let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 20 })
  let sorting = $state<SortingState>([])
  let columnFilters = $state<ColumnFiltersState>([])
  let columnVisibility = $state<VisibilityState>({ releaseDate: false })

  const statusFilter = $derived(
    (columnFilters.find((filter) => filter.id === 'hasBeenListened')?.value as string | undefined) ??
      'all'
  )
  const typeFilter = $derived(
    (columnFilters.find((filter) => filter.id === 'itemType')?.value as string | undefined) ?? 'all'
  )

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
    if (value === 'all') {
      table.getColumn('hasBeenListened')?.setFilterValue(undefined)
    } else {
      table.getColumn('hasBeenListened')?.setFilterValue(value)
    }
  }

  function handleTypeFilterChange(value: string) {
    if (value === 'all') {
      table.getColumn('itemType')?.setFilterValue(undefined)
    } else {
      table.getColumn('itemType')?.setFilterValue(value)
    }
  }

  function handleMobileSortChange(value: string) {
    const selectedOption = mobileSortOptions.find((option) => option.value === value)
    if (!selectedOption) return
    sorting = selectedOption.sorting
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

  const selectedMobileSortOption = $derived(
    mobileSortOptions.find(
      (option) =>
        option.sorting.length === sorting.length &&
        option.sorting.every(
          (entry, index) => entry.id === sorting[index]?.id && entry.desc === sorting[index]?.desc
        )
    )
  )

  const mobileSort = $derived<MobileSort | 'custom'>(
    sorting.length === 0 ? 'added_asc' : (selectedMobileSortOption?.value ?? 'custom')
  )

  const mobileSortLabel = $derived(
    mobileSortOptions.find((option) => option.value === mobileSort)?.label ??
      sorting
        .map(
          (entry) =>
            `${columnLabels[entry.id] ?? entry.id} (${entry.desc ? 'descending' : 'ascending'})`
        )
        .join(', ')
  )

  // Sorting rewrites the row order under the reader with no focus change, so the
  // new order has to be spoken. Empty until the first sort: a live region that
  // arrives already full announces nothing anyway.
  const sortAnnouncement = $derived(
    sorting
      .map(
        (entry) =>
          `Sorted by ${columnLabels[entry.id] ?? entry.id}, ${
            entry.desc ? 'descending' : 'ascending'
          }`
      )
      .join(', ')
  )
</script>

<div class="w-full">
  <p id="sort-announcement" class="sr-only" role="status">{sortAnnouncement}</p>
  <p class="sr-only" role="status" aria-atomic="true">
    {items.some((item) => item.externalLinksPending) ? 'Fetching links…' : ''}
  </p>
  <div class="flex flex-wrap items-center gap-2 py-4">
    <!-- Status filter -->
    <label class="flex w-full items-center gap-2 md:w-[190px]">
      <span class="text-sm font-medium">Status</span>
      <Select
        class="min-w-0 flex-1"
        value={statusFilter}
        onchange={(event) => handleStatusFilterChange(event.currentTarget.value)}
      >
        {#each statusFilterOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    </label>

    <!-- Type filter -->
    <label class="flex w-full items-center gap-2 md:w-[180px]">
      <span class="text-sm font-medium">Type</span>
      <Select
        class="min-w-0 flex-1"
        value={typeFilter}
        onchange={(event) => handleTypeFilterChange(event.currentTarget.value)}
      >
        {#each typeFilterOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    </label>

    <!-- Mobile sort -->
    <label class="flex w-full items-center gap-2 md:hidden">
      <span class="text-sm font-medium">Sort</span>
      <Select
        class="min-w-0 flex-1"
        value={mobileSort}
        onchange={(event) => handleMobileSortChange(event.currentTarget.value)}
      >
        {#if mobileSort === 'custom'}
          <!-- The desktop table can sort by a column the phone offers no option
               for. Naming that order keeps the control honest; disabled because
               choosing it again would change nothing. -->
          <option value="custom" disabled>{mobileSortLabel}</option>
        {/if}
        {#each mobileSortOptions as option (option.value)}
          <option value={option.value}>{option.label}</option>
        {/each}
      </Select>
    </label>

    <!-- Column visibility toggle (desktop table only; mobile cards ignore column visibility) -->
    <div class="hidden md:ml-auto md:block">
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="outline">
              Columns <ChevronDownIcon class="ml-2 size-4" />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {#each table.getAllColumns().filter((col) => col.getCanHide()) as column (column.id)}
            <DropdownMenu.CheckboxItem
              class="capitalize"
              closeOnSelect={false}
              bind:checked={() => column.getIsVisible(), (v) => column.toggleVisibility(!!v)}
            >
              {columnLabels[column.id] ?? column.id}
            </DropdownMenu.CheckboxItem>
          {/each}
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </div>

  <div class="hidden overflow-x-auto rounded-md border md:block">
    <Table.Root>
      <Table.Header>
        {#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
          <Table.Row>
            {#each headerGroup.headers as header (header.id)}
              <Table.Head
                aria-sort={header.column.getCanSort()
                  ? header.column.getIsSorted() === 'asc'
                    ? 'ascending'
                    : header.column.getIsSorted() === 'desc'
                      ? 'descending'
                      : 'none'
                  : undefined}
              >
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
          <!-- Raw <tr> instead of <Table.Row>: Svelte transition directives (in:/out:) only work on
               HTML elements, not components. Classes mirror table-row.svelte exactly. -->
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
              {#if cell.column.id === 'title'}
                <!-- Raw <th scope="row"> instead of <Table.Cell>: the title is what names the
                     row, so reading down any other column announces it first. Classes mirror
                     table-cell.svelte, plus the font-normal that undoes a <th>'s default bold. -->
                <th
                  scope="row"
                  data-slot="table-cell"
                  class="p-2 text-left align-middle font-normal whitespace-nowrap"
                >
                  <!-- Hidden from the reading order but reachable by id: every control in the
                       row points at it with aria-describedby, and a description target is
                       still read when it is aria-hidden. Left in the order it would say the
                       row twice to anyone walking the cells. -->
                  <span id={`row-summary-${row.original.id}`} class="sr-only" aria-hidden="true"
                    >{rowSummary(row.original)}</span
                  >
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </th>
              {:else}
                <Table.Cell>
                  <FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
                </Table.Cell>
              {/if}
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

  <div class="space-y-3 md:hidden">
    {#each table.getRowModel().rows as row (row.original.id)}
      <article
        id={`mobile-item-${row.original.id}`}
        class={[
          'rounded-xl border bg-card p-3 shadow-sm',
          highlightedItemId === row.original.id ? 'bg-warning/20' : '',
        ].join(' ')}
      >
        <span id={`mobile-row-summary-${row.original.id}`} class="sr-only" aria-hidden="true"
          >{rowSummary(row.original)}</span
        >
        <div class="flex items-start gap-3">
          <CoverArt
            src={row.original.coverArt}
            alt={`Cover of ${row.original.title}`}
            size="sm"
            class="shrink-0"
          />
          <div class="min-w-0 flex-1 leading-tight text-pretty">
            <DataTableTitleCell
              title={row.original.title}
              albumName={row.original.itemType === 'track'
                ? (row.original.albumName ?? null)
                : null}
            />
            <p class="text-muted-foreground mt-1 truncate text-sm text-pretty">
              {row.original.artists?.join(', ') || 'Unknown artist'}
            </p>
          </div>
          <DataTableActions
            item={row.original}
            describedBy={`mobile-row-summary-${row.original.id}`}
            {onDelete}
            {onToggleListen}
          />
        </div>
        <div class="mt-3 flex flex-wrap items-center gap-2">
          <DataTableTypeBadge type={row.original.itemType} />
          <DataTableStatusBadge hasBeenListened={row.original.hasBeenListened} />
        </div>
        {#if row.original.externalLinksPending || row.original.externalLinks?.length}
          <div class="mt-3 border-t pt-3">
            <DataTableLinksCell
              item={row.original}
              describedBy={`mobile-row-summary-${row.original.id}`}
            />
          </div>
        {/if}
      </article>
    {:else}
      <div class="rounded-lg border p-6 text-center text-sm text-muted-foreground">No results.</div>
    {/each}
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
