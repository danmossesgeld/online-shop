<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { notifications } from '$lib/components/Notification.svelte';
  import { clearStores } from '$lib/store/items';
  import { clearCart } from '$lib/store/cart';
  import { logout } from '$lib/auth';

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
    
    // Use centralized logout function
    logout().then(() => {
      window.location.href = '/login';
    }).catch((error) => {
      console.error('Error during logout:', error);
      notifications.add('Error logging out', 'error');
    });
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
        // Clear theme
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        
        // Clear stores
        clearStores();
        clearCart();
        
        // Redirect to login
        window.location.href = '/login';
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
        // Clear theme
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
        
        // Clear stores
        clearStores();
        clearCart();
        
        // Redirect to login
        window.location.href = '/login';
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
  <div class="min-h-screen bg-base-100 relative max-w-[100vw] overflow-x-hidden">
    <!-- Portrait Mode Warning -->
    <div class="lg:hidden fixed inset-0 bg-base-100 z-[60] portrait:flex hidden items-center justify-center flex-col p-8" style="touch-action: none;">
      <span class="material-symbols-outlined text-6xl text-primary animate-bounce mb-4">screen_rotation</span>
      <h2 class="text-xl font-semibold text-base-content mb-2 text-center">Please Rotate Your Device</h2>
      <p class="text-base-content/60 text-center">This dashboard works best in landscape mode</p>
    </div>

    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside class="fixed inset-y-0 left-0 bg-base-100 border-r border-base-300 shadow-sm z-50 transition-all duration-300"
        class:w-72={showSidebar}
        class:w-16={!showSidebar}
      >
        <div class="flex flex-col h-full relative">
          <!-- Toggle Sidebar Button -->
          <button
            class="absolute -right-4 top-1/2 -translate-y-1/2 bg-base-100 border border-base-300 rounded-full p-1.5 shadow-lg hover:shadow-xl hover:bg-primary/10 hover:border-primary transition-all duration-300 group z-50"
            on:click={() => showSidebar = !showSidebar}
            aria-label={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            <span class="material-symbols-outlined text-sm text-base-content group-hover:text-primary transition-colors duration-300" style="font-variation-settings: 'FILL' 1">
              {showSidebar ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>

          <!-- Logo -->
          <button 
            on:click={resetHome}
            class="flex items-center justify-center border-b border-base-300 text-primary group relative w-full hover:bg-primary/10 transition-all duration-300"
            class:h-16={showSidebar}
            class:h-12={!showSidebar}
            disabled={isRefreshing}
          >
            {#if isRefreshing}
              <span class="material-symbols-outlined animate-spin text-primary">sync</span>
            {:else}
              <div class="flex items-center gap-2">
                {#if showSidebar}
                <div class="relative flex items-center justify-center">
                  <iconify-icon icon="ri:store-2-line" width="30" height="30" class="text-primary"></iconify-icon>
                </div>
                <div class="relative overflow-hidden">
                  <span class="relative inline-flex transition-transform duration-300 ease-out">
                    <span class="text-primary/90 text-base font-extrabold">DOKI</span>
                    <span class="text-primary text-base font-black">SHOPPE</span>
                  </span>
                  <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                {:else}
                <div class="relative flex items-center justify-center">
                  <iconify-icon icon="ri:store-2-line" width="27" height="27" class="text-primary"></iconify-icon>
                </div>
                {/if}
              </div>
            {/if}
          </button>

          <!-- User Info -->
          {#if showSidebar}
          <div class="p-3 border-b border-base-300">
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span class="material-symbols-outlined text-lg text-primary">account_circle</span>
              </div>
              <div class="overflow-hidden">
                <p class="text-xs font-semibold text-base-content truncate">{user?.email}</p>
                <p class="text-xs text-base-content/60 capitalize">{userType}</p>
              </div>
            </div>
          </div>
          {/if}

          <!-- Navigation -->
          <nav class="flex-1 overflow-y-auto py-2">
            {#each navItems.filter(item => userType === 'admin' || !item.adminOnly) as item}
              <a
                href={item.path}
                class="flex items-center text-sm text-base-content/60 hover:bg-primary/10 hover:text-primary transition-all duration-200 group relative"
                class:px-4={showSidebar}
                class:px-2={!showSidebar}
                class:py-2={showSidebar}
                class:py-1.5={!showSidebar}
                class:active={activeTab === item.path}
                title={!showSidebar ? item.label : ''}
              >
                <span class="material-symbols-outlined text-lg group-hover:scale-110 transition-transform duration-200" class:mr-3={showSidebar}>{item.icon}</span>
                {#if showSidebar}
                  {item.label}
                {/if}
                {#if activeTab === item.path}
                  <div class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>
                {/if}
              </a>
            {/each}
          </nav>

          <!-- Logout Button -->
          <div class="p-2 border-t border-base-300">
            <button
              on:click={handleLogout}
              class="w-full flex items-center justify-center text-sm font-medium text-base-100 bg-error hover:bg-error/90 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
              class:px-4={showSidebar}
              class:px-1={!showSidebar}
              class:py-2={showSidebar}
              class:py-1.5={!showSidebar}
              title={!showSidebar ? 'Logout' : ''}
            >
              <span class="material-symbols-outlined text-base {showSidebar ? 'mr-2' : ''}">logout</span>
              {#if showSidebar}
                Logout
              {/if}
            </button>
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main 
        class="flex-1 h-screen overflow-y-auto overflow-x-hidden transition-all duration-300 bg-base-100 overscroll-none"
        class:ml-72={showSidebar}
        class:ml-16={!showSidebar}
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