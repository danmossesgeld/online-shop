<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { notifications } from '$lib/components/Notification.svelte';

  // State management
  let user: any = null;
  let isLoading = true;
  let userType = '';
  let showSidebar = true;
  let activeTab = 'personalInfo';
  let isRefreshing = false;
  let isMobileView = false;

  // Viewport handling
  function updateViewportScale() {
    isMobileView = window.innerWidth < 1024;
    const viewportContent = window.matchMedia("(orientation: portrait)").matches || !isMobileView
      ? 'width=device-width, initial-scale=1'
      : 'width=device-width, initial-scale=0.9, maximum-scale=0.9';
    
    document.querySelector('meta[name="viewport"]')?.setAttribute('content', viewportContent);
  }

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

  // Navigation handlers
  const handleNavigation = async (path: string, isAdmin = false) => {
    if (isMobileView) {
      showSidebar = false;
    }
    
    const params = new URLSearchParams();
    if (isAdmin) {
      params.set('view', 'admin');
    }
    
    await goto(`${path}${params.toString() ? `?${params.toString()}` : ''}`);
  };

  function handleTabChange(item: NavItem) {
    activeTab = item.id;
    handleNavigation(item.path, item.adminOnly);
  }

  function handleLogout() {
    if (isMobileView) {
      showSidebar = false;
    }
    auth.signOut();
  }

  const resetHome = async (): Promise<void> => {
    try {
      isRefreshing = true;
      window.location.href = '/mainpage';
    } catch (err) {
      console.error('Error resetting home:', err);
      notifications.add('Error resetting home page', 'error');
    } finally {
      isRefreshing = false;
    }
  };

  onMount(() => {
    // Initial viewport setup and listeners
    updateViewportScale();
    window.addEventListener('orientationchange', () => setTimeout(updateViewportScale, 100));
    window.addEventListener('resize', updateViewportScale);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        goto('/login');
        return;
      }

      try {
        user = currentUser;
        userType = await getUserType(currentUser.uid);
        
        const currentPath = window.location.pathname;
        const currentSearchParams = new URLSearchParams(window.location.search);
        const availableItems = navItems.filter(item => userType === 'admin' || !item.adminOnly);
        const defaultPath = userType === 'admin' ? '/userdashboard/items' : '/userdashboard/personalInfo';

        // Handle path matching and redirects
        const matchingItem = availableItems.find(item => currentPath.startsWith(item.path.split('?')[0]));
        if (!matchingItem || currentPath === '/userdashboard') {
          handleNavigation(defaultPath, userType === 'admin');
          return;
        }
        
        activeTab = matchingItem.id;
        
        // Ensure admin view for admin users
        if (currentPath.startsWith('/userdashboard/orderList') && 
            userType === 'admin' && 
            currentSearchParams.get('view') !== 'admin') {
          handleNavigation('/userdashboard/orderList', true);
        }
      } catch (error) {
        console.error('Error loading user type:', error);
        goto('/login');
      } finally {
        isLoading = false;
      }
    });

    return () => {
      window.removeEventListener('orientationchange', updateViewportScale);
      window.removeEventListener('resize', updateViewportScale);
      unsubscribe();
    };
  });
</script>

{#if isLoading}
  <LoadingSpinner message="Checking authentication..." fullScreen={true} color="orange" />
{:else}
  <div class="min-h-screen bg-gray-50 relative max-w-[100vw] overflow-x-hidden">
    <!-- Portrait Mode Warning -->
    <div class="lg:hidden fixed inset-0 bg-white z-[60] portrait:flex hidden items-center justify-center flex-col p-8" style="touch-action: none;">
      <span class="material-symbols-outlined text-6xl text-orange-500 animate-bounce mb-4">screen_rotation</span>
      <h2 class="text-xl font-semibold text-gray-800 mb-2 text-center">Please Rotate Your Device</h2>
      <p class="text-gray-600 text-center">This dashboard works best in landscape mode</p>
    </div>

    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="fixed inset-y-0 left-0 bg-white border-r border-gray-100 shadow-sm z-50 transition-all duration-300"
        class:w-72={showSidebar}
        class:w-20={!showSidebar}
      >
        <div class="flex flex-col h-full relative">
          <!-- Toggle Sidebar Button -->
          <button
            class="absolute -right-5 top-1/2 -translate-y-1/2 bg-white border border-gray-200 rounded-full p-2.5 shadow-lg hover:shadow-xl hover:bg-orange-50 hover:border-orange-200 transition-all duration-300 group z-50"
            on:click={() => showSidebar = !showSidebar}
            aria-label={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <span class="material-symbols-outlined text-gray-600 group-hover:text-orange-600 transition-colors duration-300" style="font-variation-settings: 'FILL' 1">
              {showSidebar ? 'chevron_left' : 'chevron_right'}
            </span>
            <div class="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap">
              {showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
            </div>
          </button>

          <!-- Logo -->
          <button 
            on:click={resetHome}
            class="flex items-center justify-center h-20 border-b border-gray-100 text-orange-500 group relative px-3 py-2 w-full hover:bg-orange-50/30 transition-all duration-300"
            disabled={isRefreshing}
          >
            {#if isRefreshing}
              <span class="material-symbols-outlined animate-spin text-orange-500">sync</span>
            {:else}
              <div class="flex items-center gap-2">
                <div class="relative flex items-center justify-center">
                  <iconify-icon icon="ri:store-2-line" width="24" height="24"></iconify-icon>
                </div>
                {#if showSidebar}
                  <div class="relative overflow-hidden">
                    <span class="relative inline-flex transition-transform duration-300 ease-out">
                      <span class="text-orange-600/90 text-lg font-bold">DOKI</span>
                      <span class="text-orange-500 text-lg font-extrabold">SHOPPE</span>
                    </span>
                    <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-orange-500/0 via-orange-500 to-orange-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                {:else}
                  <span class="text-lg font-extrabold">DS</span>
                {/if}
              </div>
            {/if}
          </button>

          <!-- User Info -->
          <div class="p-4 border-b border-gray-100">
            <div class="flex items-center space-x-4">
              <div class="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-xl text-orange-600">account_circle</span>
              </div>
              {#if showSidebar}
                <div class="overflow-hidden">
                  <p class="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                  <p class="text-xs text-gray-500 capitalize">{userType}</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto py-4">
            {#each navItems.filter(item => userType === 'admin' || !item.adminOnly) as item}
              <a
                href={item.path}
                class="flex items-center px-4 py-2.5 text-sm text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-all duration-200 group relative"
                class:active={activeTab === item.path}
                title={!showSidebar ? item.label : ''}
              >
                <span class="material-symbols-outlined text-lg mr-3 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
                {#if showSidebar}
                  {item.label}
                {/if}
                {#if activeTab === item.path}
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full"></div>
                {/if}
              </a>
            {/each}
          </nav>

          <!-- Logout Button -->
          <div class="p-4 border-t border-gray-100">
            <button
              on:click={handleLogout}
              class="w-full flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              title={!showSidebar ? 'Logout' : ''}
            >
              <span class="material-symbols-outlined text-lg {showSidebar ? 'mr-2' : ''}">logout</span>
              {#if showSidebar}
                Logout
              {/if}
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main 
        class="flex-1 h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 bg-gray-50 overscroll-none"
        class:ml-72={showSidebar}
        class:ml-20={!showSidebar}
        style="height: calc(100vh); -webkit-overflow-scrolling: touch;"
      >
        <div class="container mx-auto p-6 max-w-full">
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

  /* Prevent scroll bounce on mobile */
  :global(body) {
    overscroll-behavior: none;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
    position: fixed;
  }

  :global(html) {
    overflow: hidden;
    height: 100%;
  }
</style> 