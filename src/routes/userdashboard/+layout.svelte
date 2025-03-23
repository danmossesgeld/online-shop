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
  let userType = '';
  let showSidebar = true;
  let activeTab = 'personalInfo';

  interface NavItem {
    id: string;
    label: string;
    icon: string;
    path: string;
    adminOnly?: boolean;
    userOnly?: boolean;
  }

  const navItems: NavItem[] = [
    { 
      id: 'personalInfo', 
      label: 'Personal Info', 
      icon: 'person', 
      path: '/userdashboard/personalInfo'
    },
    { 
      id: 'orderList', 
      label: 'Orders', 
      icon: 'shopping_bag', 
      path: '/userdashboard/orderList' 
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: 'receipt_long',
      path: '/userdashboard/transactions'
    },
    { 
      id: 'productManagement', 
      label: 'Product Management', 
      icon: 'inventory_2', 
      path: '/userdashboard/items',
      adminOnly: true 
    },
    { 
      id: 'categoryManagement', 
      label: 'Category Management', 
      icon: 'category', 
      path: '/userdashboard/categories',
      adminOnly: true 
    },
    { 
      id: 'orderManagement', 
      label: 'Order Management', 
      icon: 'shopping_cart', 
      path: '/userdashboard/orderList?view=admin',
      adminOnly: true 
    },
    {
      id: 'transactionManagement',
      label: 'Transaction Management',
      icon: 'payments',
      path: '/userdashboard/transactions?view=admin',
      adminOnly: true
    }
  ];

  const handleNavigation = (path: string) => {
    if (path.includes('orderList')) {
      // If it's the Order Management link, ensure we're in admin view
      goto('/userdashboard/orderList?view=admin');
    } else if (path.includes('transactions') && path.includes('Management')) {
      // If it's the Transaction Management link, ensure we're in admin view
      goto('/userdashboard/transactions?view=admin');
    } else {
      goto(path);
    }
  };

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        goto('/login');
        return;
      }

      try {
        user = currentUser;
        userType = await getUserType(currentUser.uid);
        
        // Set initial active tab based on user type and current path
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        const availableItems = navItems.filter(item => 
          userType === 'admin' || !item.adminOnly
        );

        // If no available items match the current path, redirect to default
        const matchingItem = availableItems.find(item => currentPath.startsWith(item.path.split('?')[0]));
        if (!matchingItem) {
          if (currentPath === '/userdashboard' || !availableItems.length) {
            handleNavigation(userType === 'admin' ? '/userdashboard/items' : '/userdashboard/personalInfo');
            return;
          }
          // If on an unauthorized path, redirect to default
          handleNavigation(userType === 'admin' ? '/userdashboard/items' : '/userdashboard/personalInfo');
          return;
        }
        
        activeTab = matchingItem.id;
        
        // If we're on the orderList path and user is admin but not in admin view, redirect to admin view
        if (currentPath.startsWith('/userdashboard/orderList') && 
            userType === 'admin' && 
            currentSearchParams.get('view') !== 'admin') {
          handleNavigation('/userdashboard/orderList?view=admin');
        }
        
      } catch (error) {
        console.error('Error loading user type:', error);
        goto('/login');
      } finally {
        isLoading = false;
      }
    });
    return unsubscribe;
  });

  function handleTabChange(item: NavItem) {
    activeTab = item.id;
    // Add a query parameter to indicate the view type
    const queryParams = new URLSearchParams();
    if (item.adminOnly) {
      queryParams.set('view', 'admin');
    } else {
      queryParams.set('view', 'user');
    }
    goto(`${item.path}?${queryParams.toString()}`);
  }

  function handleLogout() {
    auth.signOut();
  }
</script>

{#if isLoading}
  <div class="h-screen flex items-center justify-center bg-gray-50">
    <Spinner message="Loading..." fullScreen={false} color="orange" />
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <div class="flex">
      <!-- Sidebar -->
      <aside class="fixed inset-y-0 left-0 w-72 bg-white border-r border-gray-100 shadow-sm z-50">
        <div class="flex flex-col h-full">
          <!-- Logo -->
          <a href="/" class="flex items-center justify-center h-20 border-b border-gray-100 text-orange-500 font-bold text-2xl hover:text-orange-600 transition-all duration-200">
            SVELTESHOP
          </a>

          <!-- User Info -->
          <div class="p-6 border-b border-gray-100">
            <div class="flex items-center space-x-4">
              <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <span class="material-symbols-outlined text-2xl text-orange-600">account_circle</span>
              </div>
              <div>
                <p class="text-sm font-semibold text-gray-900">{user?.email}</p>
                <p class="text-xs text-gray-500 capitalize">{userType}</p>
              </div>
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto py-6">
            {#each navItems.filter(item => userType === 'admin' || !item.adminOnly) as item}
              <a
                href={item.path}
                class="flex items-center px-6 py-3 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 group relative"
                class:active={activeTab === item.path}
              >
                <span class="material-symbols-outlined text-xl mr-4 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                {item.label}
                {#if activeTab === item.path}
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full"></div>
                {/if}
              </a>
            {/each}
          </nav>

          <!-- Logout Button -->
          <div class="p-6 border-t border-gray-100">
            <button
              on:click={handleLogout}
              class="w-full flex items-center justify-center px-6 py-3 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <span class="material-symbols-outlined text-xl mr-2">logout</span>
              Logout
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 ml-72 p-8">
        <div class="max-w-7xl mx-auto">
          <slot />
        </div>
      </main>
    </div>
  </div>
{/if}

<style>
  :global(.material-symbols-outlined) {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style> 