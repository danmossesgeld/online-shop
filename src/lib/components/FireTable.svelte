<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import ItemActions from './ItemActions.svelte';
  import type { SvelteComponentTyped } from 'svelte';

  interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    formatter?: (value: any) => string;
    component?: (item: any) => string;
  }

  interface FireTableProps {
    data: any[];
    columns: Column[];
    loading: boolean;
    searchQuery: string;
    sortField: string;
    sortDirection: 'asc' | 'desc';
  }

  interface FireTableEvents {
    delete: { id: string; data: any };
    update: { id: string };
    sort: { field: string; direction: 'asc' | 'desc' };
  }
  
  export let data: FireTableProps['data'] = [];
  export let columns: FireTableProps['columns'] = [];
  export let loading: FireTableProps['loading'] = false;
  export let searchQuery: FireTableProps['searchQuery'] = '';
  export let sortField: FireTableProps['sortField'] = '';
  export let sortDirection: FireTableProps['sortDirection'] = 'asc';

  const dispatch = createEventDispatcher<FireTableEvents>();

  $: filteredData = data.filter(item => 
    Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const handleSort = (field: string) => {
    if (field === sortField) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortField = field;
      sortDirection = 'asc';
    }
    dispatch('sort', { field, direction: sortDirection });
  };
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <!-- Search Bar -->
  <div class="mb-4">
    <div class="relative">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search..."
        class="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
      />
      <span class="material-symbols-outlined absolute left-3 top-2.5 text-gray-400">search</span>
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>
  {:else if filteredData.length === 0}
    <div class="text-center py-12">
      <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">inventory_2</span>
      <p class="text-gray-500">No items found</p>
    </div>
  {:else}
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-gray-200">
        <thead class="bg-gray-50">
          <tr>
            {#each columns as column}
              <th 
                class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider {column.sortable ? 'cursor-pointer' : ''}"
                on:click={() => column.sortable && handleSort(column.key)}
              >
                {column.label}
                {#if column.sortable && sortField === column.key}
                  <span class="material-symbols-outlined text-xs align-middle ml-1">
                    {sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                  </span>
                {/if}
              </th>
            {/each}
            <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
          {#each filteredData as item (item.id)}
            <tr class="hover:bg-gray-50">
              {#each columns as column}
                <td class="px-6 py-4 whitespace-nowrap">
                  {#if column.component}
                    {@html column.component(item)}
                  {:else}
                    <div class="text-sm text-gray-900">
                      {column.formatter ? column.formatter(item[column.key]) : item[column.key]}
                    </div>
                  {/if}
                </td>
              {/each}
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <ItemActions
                  itemId={item.id}
                  images={item.images || []}
                  thumbnail={item.thumbnail || ''}
                  on:delete={() => dispatch('delete', { id: item.id, data: item })}
                  on:update={() => dispatch('update', { id: item.id })}
                />
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div> 