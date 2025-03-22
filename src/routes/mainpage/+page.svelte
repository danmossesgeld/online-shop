<script lang="ts">
  import { auth } from '$lib/firebase';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { signOut, type User } from 'firebase/auth';
  import { getFirestore, collection, getDocs, type DocumentData } from 'firebase/firestore';
  import { cart, addToCart, getCartItemCount } from '$lib/store/cart';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { page } from '$app/stores';
  import { itemsStore, loadingStore, errorStore } from './+layout.svelte';
  import { notifications } from '$lib/components/Notification.svelte';

  const db = getFirestore();
  let user: User | null = null;
  let loading = true;
  const error = writable('');

  interface Item {
    id: string;
    itemName: string;
    price: number;
    thumbnail: string;
    category: string;
  }

  interface Category {
    main: string;
    subcategories: Array<{
      group: string;
      subcategories: string[];
    }>;
  }

  let items: Item[] = [];
  let searchQuery = '';
  let categories: Category[] = [];
  let selectedMainCategory: string | null = null;
  let selectedGroup: string | null = null;
  let selectedSubCategory: string | null = null;

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
    }
  }

  // Subscribe to stores from layout
  $: {
    items = $itemsStore;
    loading = $loadingStore;
    if ($errorStore) {
      error.set($errorStore);
      notifications.add($errorStore, 'error');
    }
  }

  // Use a reactive assignment so the result is stored in filteredItems.
  $: filteredItems = (() => {
    try {
      let filtered = items;
      
      // Apply search filter
      if (searchQuery.trim()) {
        filtered = filtered.filter(item => 
          item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      // Apply category filters
      if (selectedMainCategory || selectedGroup || selectedSubCategory) {
        filtered = filtered.filter(item => {
          const categoryPath = item.category.split(' > ');
          
          // Match main category if selected
          if (selectedMainCategory && categoryPath[0] !== selectedMainCategory) {
            return false;
          }
          
          // Match group if selected
          if (selectedGroup && categoryPath[1] !== selectedGroup) {
            return false;
          }
          
          // Match subcategory if selected
          if (selectedSubCategory && categoryPath[2] !== selectedSubCategory) {
            return false;
          }
          
          return true;
        });
      }

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

  let cartCount = 0;

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged(async currentUser => {
      user = currentUser;
      if (user) {
        console.log('Your User ID:', user.uid);
        // Automatically scan for user type
        try {
          const querySnapshot = await getDocs(collection(db, 'users'));
          const users = querySnapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            type: doc.data().type
          }));
          console.log('All Users:');
          console.table(users);
          const currentUserDoc = users.find(u => u.email === user?.email);
          if (currentUserDoc) {
            console.log('Your user type:', currentUserDoc.type);
          }
        } catch (err) {
          console.error('Error scanning users:', err);
          notifications.add('Error scanning users', 'error');
        }
      }
      loading = false;
    });

    fetchCategories();

    return () => unsubscribe();
  });

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'itemcategory'));
      categories = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          main: doc.id,
          subcategories: Object.entries(data).map(([group, subcategories]) => ({
            group,
            subcategories: subcategories as string[]
          }))
        };
      });
    } catch (err) {
      console.error('Error fetching categories:', err);
      notifications.add('Error fetching categories. Please try again later.', 'error');
    }
  };

  const selectMainCategory = (category: string) => {
    if (category === selectedMainCategory) {
      // If clicking the same main category, clear all selections
      selectedMainCategory = null;
      selectedGroup = null;
      selectedSubCategory = null;
    } else {
      // Select new main category and clear sub-selections
      selectedMainCategory = category;
      selectedGroup = null;
      selectedSubCategory = null;
    }
  };

  const selectSubCategory = (group: string, subcategory: string) => {
    if (group === selectedGroup && subcategory === selectedSubCategory) {
      // If clicking the same subcategory, clear sub-selections
      selectedGroup = null;
      selectedSubCategory = null;
    } else {
      // Select new group and subcategory
      selectedGroup = group;
      selectedSubCategory = subcategory;
    }
  };

  const handleAddToCart = (product: Item) => {
    try {
      addToCart({
        id: product.id,
        name: product.itemName,
        price: product.price,
        thumbnail: product.thumbnail
      });
      cartCount = getCartItemCount();
    } catch (err) {
      console.error('Error adding to cart:', err);
      notifications.add('Error adding item to cart. Please try again.', 'error');
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
</script>

{#if loading}
  <LoadingSpinner message="Loading products..." fullScreen={true} color="orange" />
{:else if $error}
  <div class="text-red-500 text-center p-6 bg-red-50 rounded-lg max-w-md mx-auto mt-8">
    <span class="material-symbols-outlined text-2xl mb-2">error</span>
    <p>{$error}</p>
  </div>
{:else if user}
  <div class="min-h-screen bg-gray-50">
    <Navbar />

    <div class="pt-16">
      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <!-- Filter Section -->
        <div class="bg-white rounded-lg shadow-sm p-3 mb-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <!-- Category Filters -->
            <div class="flex-1 min-w-0">
              <!-- Main Categories -->
              <div class="flex flex-wrap items-center gap-2">
                {#each categories as category}
                  <button
                    on:click={() => selectMainCategory(category.main)}
                    class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                      {selectedMainCategory === category.main 
                        ? 'bg-orange-500 text-white shadow-sm' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}"
                  >
                    {category.main}
                  </button>
                {/each}
              </div>

              <!-- Subcategories (Groups) -->
              {#if selectedMainCategory}
                <div class="mt-3">
                  <div class="flex flex-wrap items-center gap-2">
                    {#each categories.find(c => c.main === selectedMainCategory)?.subcategories ?? [] as group}
                      <button
                        on:click={() => selectSubCategory(group.group, '')}
                        class="px-2.5 py-1 rounded-full text-xs transition-all duration-200
                          {selectedGroup === group.group
                            ? 'bg-orange-100 text-orange-700 font-medium shadow-sm' 
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'}"
                      >
                        {group.group}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Third-level Categories -->
              {#if selectedMainCategory && selectedGroup}
                <div class="mt-2">
                  <div class="flex flex-wrap items-center gap-2">
                    {#each categories
                      .find(c => c.main === selectedMainCategory)
                      ?.subcategories.find(g => g.group === selectedGroup)
                      ?.subcategories ?? [] as subcategory}
                      <button
                        on:click={() => selectSubCategory(selectedGroup || '', subcategory)}
                        class="px-2 py-0.5 rounded text-xs transition-all duration-200
                          {selectedSubCategory === subcategory
                            ? 'bg-orange-50 text-orange-600 font-medium border border-orange-100' 
                            : 'text-gray-500 hover:text-gray-700'}"
                      >
                        {subcategory}
                      </button>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>

            <!-- Sort Dropdown -->
            <div class="w-48 flex-shrink-0">
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
          </div>
        </div>

        <!-- Products Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {#each filteredItems as item}
            <a 
              href="/product/{item.id}" 
              class="bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-1"
            >
              <div class="aspect-square bg-gray-50 p-3">
                <img 
                  src={item.thumbnail} 
                  alt={item.itemName}
                  class="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
              <div class="p-3">
                <h3 class="font-medium text-gray-900 text-sm mb-1 line-clamp-2">{item.itemName}</h3>
                <p class="text-orange-500 font-semibold text-sm">₱{item.price.toFixed(2)}</p>
                <button
                  on:click|preventDefault={() => handleAddToCart(item)}
                  class="mt-2 w-full bg-gray-50 text-gray-700 hover:bg-gray-100 py-1.5 px-3 rounded text-xs font-medium transition-colors duration-200 flex items-center justify-center gap-1.5"
                >
                  <span class="material-symbols-outlined text-sm">shopping_cart</span>
                  Add to Cart
                </button>
              </div>
            </a>
          {/each}
        </div>

        <!-- Empty State -->
        {#if filteredItems.length === 0}
          <div class="text-center py-8">
            <span class="material-symbols-outlined text-3xl text-gray-400 mb-2">search_off</span>
            <h3 class="text-base font-medium text-gray-900 mb-1">No products found</h3>
            <p class="text-sm text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
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
{/if}