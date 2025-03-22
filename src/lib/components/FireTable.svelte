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

<div class="bg-white rounded-lg flex flex-col h-full">
  <!-- Search, Sort and Count -->
  <div class="flex flex-wrap items-center justify-between gap-3 p-3 border-b border-gray-100">
    <!-- Search -->
    <div class="relative w-full sm:w-auto sm:min-w-[200px] sm:max-w-xs">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search items..."
        class="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
        aria-label="Search items"
      />
      <span class="material-symbols-outlined absolute left-2 top-1.5 text-gray-400 text-lg">search</span>
    </div>

    <!-- Right Side Controls -->
    <div class="flex items-center gap-3 w-full sm:w-auto justify-end">
      <!-- Sort Controls -->
      {#if sortableColumns.length > 0}
        <div class="flex items-center gap-2 min-w-[150px] max-w-[200px]">
          <select
            id="sortField"
            bind:value={sortField}
            class="w-full text-sm border border-gray-200 rounded-lg py-1.5 px-2 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
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
              class="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-150"
              title={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
              aria-label={sortDirection === 'asc' ? 'Sort Ascending' : 'Sort Descending'}
            >
              <span class="material-symbols-outlined text-gray-500 text-lg">
                {getSortIcon(sortDirection)}
              </span>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Count -->
      <div class="text-sm text-gray-500 whitespace-nowrap min-w-[60px] text-right">
        {filteredData.length} item{filteredData.length !== 1 ? 's' : ''}
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex-1 flex justify-center items-center h-32">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" role="status">
        <span class="sr-only">Loading...</span>
      </div>
    </div>
  {:else if filteredData.length === 0}
    <div class="flex-1 flex items-center justify-center py-6">
      <div class="text-center">
        <span class="material-symbols-outlined text-3xl text-gray-400 mb-2">inventory_2</span>
        <p class="text-sm text-gray-500">No items found</p>
      </div>
    </div>
  {:else}
    <div class="flex-1 overflow-x-auto">
      <div class="min-w-full inline-block align-middle">
        <table class="min-w-full table-auto divide-y divide-gray-100" role="table">
          <thead>
            <tr class="bg-gray-50/50">
              {#each enhancedColumns as column}
                <th 
                  class="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
                  style="width: {column.width}; min-width: {column.minWidth}; max-width: {column.maxWidth}"
                  scope="col"
                >
                  <div class="truncate">{column.label}</div>
                </th>
              {/each}
              <th 
                class="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider" 
                style="width: 80px; min-width: 80px"
                scope="col"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each filteredData as item (item.id)}
              <tr class="hover:bg-gray-50/50 transition-colors duration-150">
                {#each enhancedColumns as column}
                  <td 
                    class="px-3 py-2 whitespace-nowrap text-center"
                    style="width: {column.width}; min-width: {column.minWidth}; max-width: {column.maxWidth}"
                  >
                    {#if column.component}
                      {@html column.component(item)}
                    {:else}
                      <div class="text-sm text-gray-700 truncate">
                        {column.formatter ? column.formatter(item[column.key]) : String(item[column.key] || '')}
                      </div>
                    {/if}
                  </td>
                {/each}
                <td class="px-2 py-2 whitespace-nowrap" style="width: 80px; min-width: 80px">
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

  /* Style select element */
  select {
    appearance: none;
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
  }
</style> 