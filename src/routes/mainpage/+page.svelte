<script lang="ts">
  import { auth, db } from '$lib/firebase';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { signOut, type User } from 'firebase/auth';
  import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { page } from '$app/stores';
  import { itemsStore, categoriesStore, loadingStore, errorStore, type Item, type Category, fetchItems, fetchCategories, initializeStores } from '$lib/store/items';
  import { authStore as globalAuthStore } from '$lib/store/auth';
  import { notifications } from '$lib/components/Notification.svelte';
  import { goto } from '$app/navigation';

  $: user = $globalAuthStore.user;
  let adminEmails: string[] = [];

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  let searchQuery = '';
  let selectedCategory: string | null = null;
  let selectedGroup: string | null = null;
  let selectedSubcategory: string | null = null;
  let currentCategory: Category | null = null;
  let isSearchActive = false;

  // Add new state for expanded categories
  let expandedCategories: Set<string> = new Set();

  // Store subscriptions and reactive declarations
  $: items = $itemsStore;
  $: categories = $categoriesStore;
  $: isLoading = $loadingStore || $itemsStore.length === 0 || $categoriesStore.length === 0;

  // Define the sort options type explicitly.
  type SortOption = 'relevance' | 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc';
  let sortBy: SortOption = 'relevance';
  let minPrice = 0;
  let maxPrice = 10000;

  // Watch for URL search parameter changes
  $: {
    const q = $page.url.searchParams.get('q');
    if (q !== null) {
      searchQuery = q;
      isSearchActive = true;
    } else {
      isSearchActive = false;
    }
    const category = $page.url.searchParams.get('category');
    if (category !== null && category !== selectedCategory) {
      selectedCategory = category;
      selectedGroup = null;
      selectedSubcategory = null;
    }
  }

  // Reactive filtered items based on search and category filters
  $: filteredItems = (() => {
    try {
      let filtered = [...$itemsStore]; // Use $ shorthand for direct store access
      
      // Apply search filter
      if (searchQuery.trim()) {
        filtered = filtered.filter(item => 
          item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply category filters if selected
      filtered = filtered.filter(item => {
        if (!selectedCategory) return true;
        
        // Split the item's category into parts
        const itemCategoryParts = item.category.split(' > ');
        const selectedParts = [selectedCategory];
        
        if (selectedGroup) {
          selectedParts.push(selectedGroup);
        }
        if (selectedSubcategory) {
          // Filter out the 'icon' field from subcategories
          const subcategories = $categoriesStore.find(c => c.name === selectedCategory)?.groups[selectedGroup ?? ''] ?? [];
          const validSubcategories = subcategories.filter(sub => sub !== 'icon');
          if (!validSubcategories.includes(selectedSubcategory)) return false;
          selectedParts.push(selectedSubcategory);
        }
        
        // Check if the selected category path matches the item's category path
        return selectedParts.every((part, index) => itemCategoryParts[index] === part);
      });
      
      // Apply sorting
      const sortedItems = [...filtered];
      switch (sortBy) {
        case 'priceAsc':
          sortedItems.sort((a, b) => a.price - b.price);
          break;
        case 'priceDesc':
          sortedItems.sort((a, b) => b.price - a.price);
          break;
        case 'nameAsc':
          sortedItems.sort((a, b) => a.itemName.localeCompare(b.itemName));
          break;
        case 'nameDesc':
          sortedItems.sort((a, b) => b.itemName.localeCompare(a.itemName));
          break;
      }

      return sortedItems;
    } catch (err) {
      console.error('Error filtering items:', err);
      notifications.add('Error filtering items', 'error');
      return [];
    }
  })();

  // Reactive statement to update currentCategory
  $: {
    if (selectedCategory) {
      currentCategory = $categoriesStore.find(c => c.name === selectedCategory) || null;
    } else {
      currentCategory = null;
    }
  }

  // Create reactive category items store
  $: categoryItems = selectedCategory 
    ? filteredItems.filter(item => item.category.startsWith(selectedCategory as string))
    : [];

  // Create reactive category items by name store
  $: categoryItemsByName = Object.fromEntries(
    $categoriesStore.map(category => [
      category.name,
      filteredItems.filter(item => item.category.startsWith(category.name))
    ])
  ) as Record<string, Item[]>;

  onMount(() => {
    // Only initialize stores if user is authenticated
    if (user) {
      initializeStores().then(() => {
        checkAdminStatus();
      });
    }
  });

  async function checkAdminStatus() {
    if (!user) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().role === 'admin') {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        usersSnapshot.forEach(doc => {
          const userData = doc.data();
          if (userData.role === 'admin') {
            adminEmails.push(userData.email);
          }
        });
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
    }
  }

  const selectCategory = (category: string) => {
    if (category === selectedCategory) {
      // If clicking the same category, clear all selections
      selectedCategory = null;
      selectedGroup = null;
      selectedSubcategory = null;
    } else {
      // Select new category and clear sub-selections
      selectedCategory = category;
      selectedGroup = null;
      selectedSubcategory = null;
    }
  };

  const selectSubcategory = (group: string, subcategory: string) => {
    if (group === selectedGroup && subcategory === selectedSubcategory) {
      // If clicking the same subcategory, clear sub-selections
      selectedGroup = null;
      selectedSubcategory = null;
    } else {
      // Select new group and subcategory
      selectedGroup = group;
      selectedSubcategory = subcategory;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
      notifications.add('Error logging out. Please try again.', 'error');
    }
  };

  // Function to toggle category expansion
  const toggleCategory = (categoryName: string) => {
    const newExpandedCategories = new Set(expandedCategories);
    if (newExpandedCategories.has(categoryName)) {
      newExpandedCategories.delete(categoryName);
    } else {
      newExpandedCategories.add(categoryName);
    }
    expandedCategories = newExpandedCategories;
  };

  // Function to get items for a category with limit
  function getCategoryItems(categoryName: string | null, limit?: number): Item[] {
    if (!categoryName) return [];
    const items = categoryItems;
    return limit ? items.slice(0, limit) : items;
  }

  // Helper function for non-null category names with limit
  function getCategoryItemsByName(categoryName: string, limit?: number): Item[] {
    const items = categoryItemsByName[categoryName] || [];
    return limit ? items.slice(0, limit) : items;
  }

  // Helper function to get items for a category safely
  function getItemsForCategory(categoryName: string | null, limit?: number): Item[] {
    if (!categoryName) return [];
    return getCategoryItemsByName(categoryName, limit);
  }
</script>

<svelte:head>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</svelte:head>

{#if $globalAuthStore.isLoading}
  <LoadingSpinner message="Checking authentication..." fullScreen={true} color="orange" />
{:else if !$globalAuthStore.isAuthenticated}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-gray-400 mb-4">lock</span>
      <h1 class="text-2xl font-semibold text-gray-700 mb-2">Please Log In</h1>
      <p class="text-gray-500 mb-6">You need to be logged in to view this page.</p>
      <a href="/login" class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200">
        <span class="material-symbols-outlined mr-2">login</span>
        Log In
      </a>
    </div>
  </div>
{:else if isLoading}
  <LoadingSpinner message="Loading products and categories..." fullScreen={true} color="orange" />
{:else if $errorStore}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-red-500 mb-4">error</span>
      <h1 class="text-2xl font-semibold text-gray-700 mb-2">Error</h1>
      <p class="text-gray-500 mb-6">{$errorStore}</p>
      <button
        on:click={() => window.location.reload()}
        class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
      >
        <span class="material-symbols-outlined mr-2">refresh</span>
        Try Again
      </button>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <Navbar />

    <div class="pt-16">
      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <!-- Filter Section -->
        <div class="bg-white rounded-lg shadow-sm p-3 mb-4">
          <div class="flex flex-col gap-4">
            <!-- Sort Dropdown - Moved to top for better mobile UX -->
            <div class="w-full sm:w-48">
              <select 
                bind:value={sortBy}
                class="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 border-none focus:ring-2 focus:ring-orange-500/20 transition-all duration-200 appearance-none"
                style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg width=%2220%22 height=%2220%22 viewBox=%220 0 20 20%22 fill=%22none%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M5 7.5L10 12.5L15 7.5%22 stroke=%22%236B7280%22 stroke-width=%221.67%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 0.75rem center; background-size: 1.25rem;"
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="priceAsc">Price: Low to High</option>
                <option value="priceDesc">Price: High to Low</option>
                <option value="nameAsc">Name: A-Z</option>
                <option value="nameDesc">Name: Z-A</option>
              </select>
            </div>

            <!-- Category Filters -->
            {#if !isSearchActive}
              <div class="flex-1 min-w-0">
                <!-- Main Categories -->
                <div class="overflow-x-auto pb-2 -mx-3 px-3">
                  <div class="flex gap-3 min-w-max">
                    {#each categories as category}
                      <button
                        on:click={() => selectCategory(category.name)}
                        class="group relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex-shrink-0 w-[72px]
                          {selectedCategory === category.name 
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/20' 
                            : 'bg-white hover:bg-orange-50 text-gray-700 hover:text-orange-600 border border-gray-100 hover:border-orange-200 shadow-sm hover:shadow-md'}"
                      >
                        <div class="relative flex items-center justify-center w-full h-7">
                          {@html category.icon}
                          {#if selectedCategory === category.name}
                            <div class="absolute inset-0 animate-ping-slow bg-white/20 rounded-full"></div>
                          {/if}
                        </div>
                        <span class="text-[11px] font-medium text-center leading-[1.2] w-full">{category.name}</span>
                      </button>
                    {/each}
                  </div>
                </div>

                <!-- Subcategories (Groups) -->
                {#if selectedCategory}
                  <div class="mt-4">
                    <div class="overflow-x-auto pb-2 -mx-3 px-3">
                      <div class="flex gap-2 min-w-max">
                        {#each Object.entries(categories.find(c => c.name === selectedCategory)?.groups ?? {}).filter(([_, value]) => Array.isArray(value)) as [groupName, subcategories]}
                          <button
                            on:click={() => selectSubcategory(groupName, '')}
                            class="relative px-4 py-2 rounded-lg text-sm transition-all duration-200 flex-shrink-0
                              {selectedGroup === groupName
                                ? 'bg-orange-100 text-orange-700 font-medium shadow-sm before:absolute before:inset-x-0 before:-bottom-2 before:h-0.5 before:bg-orange-500 before:rounded-full' 
                                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-orange-600 border border-gray-100'}"
                          >
                            {groupName}
                          </button>
                        {/each}
                      </div>
                    </div>
                  </div>
                {/if}

                <!-- Third-level Categories -->
                {#if selectedCategory && selectedGroup}
                  <div class="mt-3">
                    <div class="overflow-x-auto pb-2 -mx-3 px-3">
                      <div class="flex flex-wrap gap-2 min-w-max">
                        {#each categories.find(c => c.name === selectedCategory)?.groups[selectedGroup] ?? [] as subcategory}
                          <button
                            on:click={() => selectSubcategory(selectedGroup ?? '', subcategory)}
                            class="inline-flex items-center px-3 py-1.5 rounded-full text-xs transition-all duration-200 flex-shrink-0
                              {selectedSubcategory === subcategory
                                ? 'bg-orange-500 text-white font-medium shadow-sm' 
                                : 'bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600'}"
                          >
                            <span class="material-symbols-outlined text-[16px] mr-1">
                              {selectedSubcategory === subcategory ? 'check_circle' : 'radio_button_unchecked'}
                            </span>
                            {subcategory}
                          </button>
                        {/each}
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {:else}
              <!-- Search Results Header -->
              <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold text-gray-900">Search Results for "{searchQuery}"</h2>
                <button
                  on:click={() => {
                    searchQuery = '';
                    window.location.href = '/mainpage';
                  }}
                  class="inline-flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <span class="material-symbols-outlined text-sm mr-1">clear</span>
                  Clear Search
                </button>
              </div>
            {/if}
          </div>
        </div>

        <!-- Products Grid -->
        {#if selectedCategory}
          <!-- If a category is selected, show only its products -->
          {@const categoryItems = getCategoryItems(selectedCategory)}
          {#if categoryItems.length > 0}
            <div class="mb-8">
              <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {@html currentCategory?.icon || '<iconify-icon icon="material-symbols:category" class="text-orange-500"></iconify-icon>'}
                {selectedCategory}
              </h2>
              
              <!-- Vertical grid layout for selected category -->
              <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {#each categoryItems as item (item.id)}
                  <div class="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 flex flex-col">
                    <!-- Product Image -->
                    <div class="relative h-40 w-full overflow-hidden bg-gray-100">
                      <button
                        on:click={() => goto(`/product/${item.itemId}`)}
                        class="w-full h-full p-0 border-none bg-transparent cursor-pointer"
                      >
                        <img
                          src={item.thumbnail || 'https://via.placeholder.com/300?text=No+Image'}
                          alt={item.itemName}
                          class="w-full h-full object-contain bg-white transform group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                          on:error={(e: Event) => {
                            const img = e.currentTarget as HTMLImageElement;
                            img.src = 'https://via.placeholder.com/300?text=No+Image';
                          }}
                        />
                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                      </button>
                    </div>

                    <!-- Product Info -->
                    <div class="p-3 flex-grow flex flex-col">
                      <h3 class="text-sm font-semibold text-gray-900 mb-1 truncate">{item.itemName}</h3>
                      <div class="flex items-center justify-between pt-1 mt-auto border-t border-gray-100">
                        <span class="text-sm font-semibold text-orange-600">
                          {formatPrice(item.price)}
                        </span>
                        <button
                          on:click={() => goto(`/product/${item.itemId}`)}
                          class="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                        >
                          <span class="material-symbols-outlined text-sm mr-0.5">visibility</span>
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
              
              <!-- Show more button at the end of the grid -->
              {#if categoryItems.length > 20 && !expandedCategories.has(selectedCategory || '')}
                <div class="flex justify-center mt-6">
                  <button
                    on:click={() => toggleCategory(selectedCategory || '')}
                    class="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-all duration-200"
                  >
                    <span class="material-symbols-outlined text-orange-500 mr-2">expand_more</span>
                    <span class="text-sm font-medium text-orange-600">Show More Items</span>
                  </button>
                </div>
              {:else if expandedCategories.has(selectedCategory || '') && categoryItems.length > 20}
                <div class="flex justify-center mt-6">
                  <button
                    on:click={() => toggleCategory(selectedCategory || '')}
                    class="inline-flex items-center px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-200 transition-all duration-200"
                  >
                    <span class="material-symbols-outlined text-orange-500 mr-2">expand_less</span>
                    <span class="text-sm font-medium text-orange-600">Show Less</span>
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        {:else}
          <!-- If no category is selected, group products under each category with horizontal scrolling -->
          {#each categories as category}
            {#if getCategoryItemsByName(category.name).length > 0}
              <div class="mb-8">
                <h2 class="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  {@html category.icon}
                  {category.name}
                </h2>
                
                <!-- Horizontal scroll layout for default view -->
                <div class="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                  <div class="flex gap-3 min-w-max">
                    {#each getCategoryItemsByName(category.name, expandedCategories.has(category.name) ? undefined : 2) as item (item.id)}
                      <div class="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 w-[200px] flex-shrink-0">
                        <!-- Product Image -->
                        <div class="relative h-32 w-full overflow-hidden bg-gray-100">
                          <button
                            on:click={() => goto(`/product/${item.itemId}`)}
                            class="w-full h-full p-0 border-none bg-transparent cursor-pointer"
                          >
                            <img
                              src={item.thumbnail || 'https://via.placeholder.com/300?text=No+Image'}
                              alt={item.itemName}
                              class="w-full h-full object-contain bg-white transform group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              decoding="async"
                              on:error={(e: Event) => {
                                const img = e.currentTarget as HTMLImageElement;
                                img.src = 'https://via.placeholder.com/300?text=No+Image';
                              }}
                            />
                            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
                          </button>
                        </div>

                        <!-- Product Info -->
                        <div class="p-2">
                          <h3 class="text-sm font-semibold text-gray-900 mb-1 truncate">{item.itemName}</h3>
                          <div class="flex items-center justify-between pt-1 border-t border-gray-100">
                            <span class="text-sm font-semibold text-orange-600">
                              {formatPrice(item.price)}
                            </span>
                            <button
                              on:click={() => goto(`/product/${item.itemId}`)}
                              class="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-md hover:bg-orange-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors duration-200"
                            >
                              <span class="material-symbols-outlined text-sm mr-0.5">visibility</span>
                              View Details
                            </button>
                          </div>
                        </div>
                      </div>
                    {/each}
                    {#if getCategoryItemsByName(category.name).length > 2}
                      <div class="group bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-all duration-300 w-[200px] flex-shrink-0">
                        <button
                          on:click={() => toggleCategory(category.name)}
                          class="w-full h-full flex flex-col items-center justify-center p-4 text-center hover:bg-gray-50 transition-colors duration-200"
                        >
                          <span class="material-symbols-outlined text-3xl text-orange-500 mb-2">
                            {expandedCategories.has(category.name) ? 'chevron_left' : 'chevron_right'}
                          </span>
                          <span class="text-sm font-medium text-orange-600">
                            {expandedCategories.has(category.name) ? 'Show Less' : 'See More'}
                          </span>
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          {/each}
        {/if}

        <!-- Empty State -->
        {#if !isLoading && filteredItems.length === 0}
          <div class="text-center py-8">
            <span class="material-symbols-outlined text-3xl text-gray-400 mb-2">search_off</span>
            <h3 class="text-base font-medium text-gray-900 mb-1">No products found</h3>
            <p class="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
<style>
  :global(iconify-icon) {
    width: 24px;
    height: 24px;
    transition: all 0.2s ease-in-out;
    color: rgb(249 115 22); /* text-orange-500 */
  }

  :global(.bg-gradient-to-br iconify-icon) {
    color: white;
    transform: scale(1.1);
  }

  /* Hide scrollbar for Chrome, Safari and Opera */
  .overflow-x-auto::-webkit-scrollbar {
    display: none;
  }
  
  /* Hide scrollbar for IE, Edge and Firefox */
  .overflow-x-auto {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }

  @keyframes ping-slow {
    75%, 100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .animate-ping-slow {
    animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
  }
</style>

