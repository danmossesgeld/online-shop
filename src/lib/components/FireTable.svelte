<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ItemActions from './ItemActions.svelte';
  import type { SvelteComponentTyped } from 'svelte';

  // Define strict types
  interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    formatter?: (value: unknown) => string;
    component?: (item: Record<string, unknown>) => string;
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    priority?: number;
  }

  interface TableItem {
    id: string;
    [key: string]: unknown;
  }

  interface FireTableProps {
    data: TableItem[];
    columns: Column[];
    loading: boolean;
    searchQuery: string;
    sortField: string;
    sortDirection: 'asc' | 'desc';
  }

  interface FireTableEvents {
    delete: { id: string; data: TableItem };
    update: { id: string };
    sort: { field: string; direction: 'asc' | 'desc' };
  }
  
  // Props with strict types
  export let data: FireTableProps['data'] = [];
  export let columns: FireTableProps['columns'] = [];
  export let loading: FireTableProps['loading'] = false;
  export let searchQuery: FireTableProps['searchQuery'] = '';
  export let sortField: FireTableProps['sortField'] = '';
  export let sortDirection: FireTableProps['sortDirection'] = 'asc';

  const dispatch = createEventDispatcher<FireTableEvents>();

  // Utility functions
  const getSortIcon = (direction: 'asc' | 'desc'): string => {
    return direction === 'asc' ? 'arrow_upward' : 'arrow_downward';
  };

  const handleSort = (field: string): void => {
    if (field === sortField) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
    dispatch('sort', { field, direction: sortDirection });
  };

  // Reactive statements
  $: enhancedColumns = columns
    .filter(col => col.key !== 'createdAt') // Remove createdAt column
    .map((col, index) => ({
      ...col,
      width: col.width || 'auto',
      minWidth: col.minWidth || '80px',
      maxWidth: col.maxWidth || 'auto',
      priority: col.priority || index
    }));

  $: sortableColumns = enhancedColumns.filter(col => col.sortable);

  $: filteredData = data.filter(item => 
    Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );
</script>

<div class="card bg-base-100 shadow-xl flex flex-col h-full w-full">
  <!-- Search, Sort and Count -->
  <div class="card-body p-4 border-b border-base-300">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <!-- Search -->
      <div class="form-control relative w-full sm:w-auto sm:min-w-[180px] sm:max-w-xs">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search items..."
          class="input input-bordered w-full pl-8 bg-base-200"
          aria-label="Search items"
        />
        <iconify-icon icon="material-symbols:search" class="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/50 text-lg"></iconify-icon>
      </div>

      <!-- Right Side Controls -->
      <div class="flex items-center gap-2 w-full sm:w-auto justify-end">
        <!-- Sort Controls -->
        {#if sortableColumns.length > 0}
          <div class="flex items-center gap-2 min-w-[120px] max-w-[180px]">
            <select
              id="sortField"
              bind:value={sortField}
              class="select select-bordered w-full bg-base-200"
              aria-label="Sort by"
            >
              <option value="">Sort by</option>
              {#each sortableColumns as column}
                <option value={column.key}>{column.label}</option>
              {/each}
            </select>
            {#if sortField}
              <button
                on:click={() => sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'}
                class="btn btn-ghost btn-sm"
                title={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
                aria-label={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
              >
                <iconify-icon icon={`material-symbols:${getSortIcon(sortDirection)}`} class="text-base-content/70 text-lg"></iconify-icon>
              </button>
            {/if}
          </div>
        {/if}

        <!-- Count -->
        <div class="text-sm text-base-content/50 whitespace-nowrap min-w-[60px] text-right">
          {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex-1 flex justify-center items-center h-32">
      <span class="loading loading-spinner loading-lg text-primary"></span>
    </div>
  {:else if filteredData.length === 0}
    <div class="flex-1 flex items-center justify-center py-6">
      <div class="text-center">
        <iconify-icon icon="material-symbols:inventory-2" class="text-3xl text-base-content/30 mb-2"></iconify-icon>
        <p class="text-sm text-base-content/50">No items found</p>
      </div>
    </div>
  {:else}
    <div class="flex-1 overflow-x-auto">
      <div class="w-full inline-block align-middle">
        <table class="table table-zebra w-full" role="table">
          <thead>
            <tr>
              {#each enhancedColumns as column}
                <th 
                  class="px-2 py-1.5 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200"
                  style="width: {column.width}; min-width: {column.minWidth}; max-width: {column.maxWidth}"
                  scope="col"
                >
                  <div class="truncate">{column.label}</div>
                </th>
              {/each}
              <th 
                class="px-1.5 py-1.5 text-center text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200" 
                style="width: 70px; min-width: 70px"
                scope="col"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {#each filteredData as item (item.id)}
              <tr class="hover:bg-base-200/50 transition-colors duration-150">
                {#each enhancedColumns as column}
                  <td 
                    class="px-2 py-1.5 whitespace-nowrap"
                    style="width: {column.width}; min-width: {column.minWidth}; max-width: {column.maxWidth}"
                  >
                    {#if column.component}
                      {@html column.component(item)}
                    {:else}
                      <div class="text-sm text-base-content truncate">
                        {column.formatter ? column.formatter(item[column.key]) : String(item[column.key] || '')}
                      </div>
                    {/if}
                  </td>
                {/each}
                <td class="px-1.5 py-1.5 whitespace-nowrap" style="width: 70px; min-width: 70px">
                  <div class="flex justify-center">
                    <ItemActions
                      itemId={item.id}
                      images={item.images as string[] || []}
                      thumbnail={item.thumbnail as string || ''}
                      on:delete={() => dispatch('delete', { id: item.id, data: item })}
                      on:update={() => dispatch('update', { id: item.id })}
                    />
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .overflow-x-auto::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .overflow-x-auto {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  /* Ensure table cells don't break into multiple lines */
  td div {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style> 