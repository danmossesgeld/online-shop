<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '$lib/components/LoadingSpinner.svelte';

  let selectedComponent: any = null;
  let activeTab = '';
  let isLoading = false;

  const loadComponent = async (tabName: string) => {
    isLoading = true;
    
    switch (tabName) {
      case 'info':
        selectedComponent = (await import('./registerItem/+page.svelte')).default;
        break;
      case 'register':
        selectedComponent = (await import('./registerItem/+page.svelte')).default;
        break;
      case 'productOrders':
        selectedComponent = (await import('./orderList/+page.svelte')).default;
        break;
      case 'personalOrders':
        selectedComponent = (await import('./orderList/+page.svelte')).default;
        break;
      default:
        selectedComponent = null;
    }
    activeTab = tabName;
    
    isLoading = false;
  };

  onMount(() => {
    // Load the default component or set a fallback
    loadComponent('info');
  });
</script>

<div class="flex min-h-screen bg-gray-100">

  <aside class="w-64 bg-white shadow-md p-6">
    <h2 class="text-2xl font-semibold mb-6">Dashboard</h2>
    <nav>
      <ul class="space-y-4">
        <li>
          <button
            on:click={() => loadComponent('info')}
            class={`w-full text-left px-4 py-2 rounded hover:bg-gray-200 transition-colors duration-200 ${
              activeTab === 'info' ? 'bg-gray-200 font-medium' : ''
            }`}
          >
            Personal Info Form
          </button>
        </li>
        <li>
          <button
            on:click={() => loadComponent('register')}
            class={`w-full text-left px-4 py-2 rounded hover:bg-gray-200 transition-colors duration-200 ${
              activeTab === 'register' ? 'bg-gray-200 font-medium' : ''
            }`}
          >
            Product Registration Form
          </button>
        </li>
        <li>
          <button
            on:click={() => loadComponent('productOrders')}
            class={`w-full text-left px-4 py-2 rounded hover:bg-gray-200 transition-colors duration-200 ${
              activeTab === 'productOrders' ? 'bg-gray-200 font-medium' : ''
            }`}
          >
            Product Order List
          </button>
        </li>
        <li>
          <button
            on:click={() => loadComponent('personalOrders')}
            class={`w-full text-left px-4 py-2 rounded hover:bg-gray-200 transition-colors duration-200 ${
              activeTab === 'personalOrders' ? 'bg-gray-200 font-medium' : ''
            }`}
          >
            Personal Order List
          </button>
        </li>
      </ul>
    </nav>
  </aside>

  <main class="flex-1 p-8">
    {#if isLoading}
      <div class="flex justify-center items-center h-full">
        <Spinner />
      </div>
    {:else if selectedComponent}
      <svelte:component this={selectedComponent} />
    {:else}
      <div class="text-gray-500 text-xl">
        Please select an option from the sidebar.
      </div>
    {/if}
  </main>
</div>
