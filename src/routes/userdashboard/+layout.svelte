<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import Navbar from '$lib/components/Navbar.svelte';
  import Spinner from '$lib/components/LoadingSpinner.svelte';

  let user: any = null;
  let isLoading = true;
  let isAdmin = false;
  let activeTab = '';

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        goto('/login');
        return;
      }

      // Check if user is admin
      const userType = await getUserType(currentUser.uid);
      if (userType !== 'admin') {
        goto('/mainpage');
        return;
      }

      user = currentUser;
      isAdmin = true;
      isLoading = false;

      // Set active tab based on current path
      const path = window.location.pathname;
      if (path.includes('/items')) activeTab = 'items';
      else if (path.includes('/personalInfo')) activeTab = 'info';
      else if (path.includes('/orderList')) activeTab = 'productOrders';
      else if (path.includes('/personalOrders')) activeTab = 'personalOrders';
    });
    return unsubscribe;
  });

  const navigate = (path: string) => {
    activeTab = path;
    goto(`/userdashboard/${path}`);
  };
</script>

{#if isLoading}
  <div class="min-h-screen flex items-center justify-center">
    <Spinner message="Loading dashboard..." />
  </div>
{:else if !isAdmin}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-red-500 mb-4">admin_panel_settings</span>
      <h1 class="text-2xl font-semibold text-gray-700 mb-2">Access Denied</h1>
      <p class="text-gray-500 mb-6">You need administrator privileges to access this page.</p>
      <a href="/mainpage" class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200">
        <span class="material-symbols-outlined mr-2">home</span>
        Return to Home
      </a>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <div class="flex pt-16">
      <!-- Sidebar -->
      <aside class="w-48 bg-white shadow-sm p-4 min-h-screen fixed">
        <h2 class="text-xl font-semibold mb-6 text-gray-700">Dashboard</h2>
        <nav>
          <ul class="space-y-2">
            <li>
              <button
                on:click={() => navigate('items')}
                class={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                  activeTab === 'items' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                <span class="material-symbols-outlined align-middle mr-2 text-sm">inventory_2</span>
                <span class="text-sm">Items List</span>
              </button>
            </li>
            <li>
              <button
                on:click={() => navigate('personalInfo')}
                class={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                  activeTab === 'info' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                <span class="material-symbols-outlined align-middle mr-2 text-sm">person</span>
                <span class="text-sm">Personal Info</span>
              </button>
            </li>
            <li>
              <button
                on:click={() => navigate('orderList')}
                class={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                  activeTab === 'productOrders' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                <span class="material-symbols-outlined align-middle mr-2 text-sm">shopping_cart</span>
                <span class="text-sm">Product Orders</span>
              </button>
            </li>
            <li>
              <button
                on:click={() => navigate('personalOrders')}
                class={`w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 ${
                  activeTab === 'personalOrders' ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600'
                }`}
              >
                <span class="material-symbols-outlined align-middle mr-2 text-sm">receipt_long</span>
                <span class="text-sm">Personal Orders</span>
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 ml-48 p-4">
        <slot />
      </main>
    </div>
  </div>
{/if}

<style>
  :global(.material-symbols-outlined) {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style> 