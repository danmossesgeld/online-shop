<script lang="ts">
  import { auth } from '$lib/firebase';
  import { writable } from 'svelte/store';
  import { onMount } from 'svelte';
  import { signOut, type User } from 'firebase/auth';
  import { getFirestore, collection, getDocs } from 'firebase/firestore';
  import { cart, addToCart, getCartItemCount } from '$lib/store/cart';
  import Navbar from '../Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  const db = getFirestore();
  let user: User | null = null;
  let loading = true;
  const error = writable('');

  let items: Array<{ id: string; itemName: string; price: number; thumbnail: string; category: string }> = [];
  let searchQuery = '';

  let categories: Array<{ main: string; subcategories: Array<{ group: string; subcategories: string[] }> }> = [];
  let selectedMainCategory: string | null = null;
  let selectedSubCategory: string | null = null;

  // Define the sort options type explicitly.
  type SortOption = 'relevance' | 'priceAsc' | 'priceDesc' | 'nameAsc' | 'nameDesc';
  let sortBy: SortOption = 'relevance';
  let minPrice = 0;
  let maxPrice = 10000;

  // Use a reactive assignment so the result is stored in filteredItems.
  $: filteredItems = (() => {
    let filtered = items.filter(item => {
      const searchMatch = item.itemName.toLowerCase().includes(searchQuery.toLowerCase());
      const categorySegments = item.category.split('/');
      const mainMatch = !selectedMainCategory || categorySegments[0] === selectedMainCategory;
      const subMatch = !selectedSubCategory || categorySegments.includes(selectedSubCategory);
      const priceMatch = item.price >= minPrice && item.price <= maxPrice;

      return searchMatch && mainMatch && subMatch && priceMatch;
    });

    // Sorting logic:
    if (sortBy === 'priceAsc') {
      filtered = filtered.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'priceDesc') {
      filtered = filtered.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'nameAsc') {
      filtered = filtered.sort((a, b) => a.itemName.localeCompare(b.itemName));
    } else if (sortBy === 'nameDesc') {
      filtered = filtered.sort((a, b) => b.itemName.localeCompare(a.itemName));
    }
    // For 'relevance' we leave the original order.

    return filtered;
  })();

  let cartCount = 0;

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      user = currentUser;
      loading = false;
    });

    fetchItems();
    fetchCategories();

    return () => unsubscribe();
  });

  const fetchItems = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'items'));
      items = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as typeof items;
    } catch (err) {
      error.set('Error fetching items: ' + (err as Error).message);
    }
  };

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
      error.set('Error fetching categories: ' + (err as Error).message);
    }
  };

  const selectMainCategory = (category: string) => {
    selectedMainCategory = category === selectedMainCategory ? null : category;
    selectedSubCategory = null;
  };

  const selectSubCategory = (subcategory: string) => {
    selectedSubCategory = subcategory === selectedSubCategory ? null : subcategory;
  };

  const handleAddToCart = (product: typeof items[number]) => {
    addToCart({
      id: product.id,
      name: product.itemName,
      price: product.price,
      thumbnail: product.thumbnail
    });
    cartCount = getCartItemCount();
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      error.set('Error logging out: ' + (err as Error).message);
    }
  };
</script>

{#if loading}
  <LoadingSpinner message="Loading products..." fullScreen={true} color="orange" />
{:else if $error}
  <div class="text-red-500 text-center p-6 bg-red-50 rounded-lg max-w-md mx-auto mt-8">
    ⚠️ {$error}
  </div>
{:else if user}
<div class="min-h-screen bg-gray-50">
  <Navbar />

  <div class="pt-16">
    <!-- Main Content -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Search and Filter Section -->
      <div class="bg-white rounded-xl shadow-sm p-4 mb-6">
        <div class="flex flex-col md:flex-row gap-3">
          <!-- Search Bar -->
          <div class="flex-1">
            <div class="relative">
              <input
                bind:value={searchQuery}
                type="text"
                placeholder="Search products..."
                class="w-full pl-10 pr-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
              />
              <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                search
              </span>
            </div>
          </div>

          <!-- Sort Dropdown -->
          <div class="w-full md:w-48">
            <select 
              bind:value={sortBy}
              class="w-full px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 transition-all duration-200"
            >
              <option value="relevance">Sort by</option>
              <option value="priceAsc">Price: Low to High</option>
              <option value="priceDesc">Price: High to Low</option>
              <option value="nameAsc">Name: A-Z</option>
              <option value="nameDesc">Name: Z-A</option>
            </select>
          </div>
        </div>

        <!-- Category Filters -->
        <div class="mt-4">
          <div class="flex flex-wrap gap-2">
            {#each categories as category}
              <button
                on:click={() => selectMainCategory(category.main)}
                class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                  {selectedMainCategory === category.main 
                    ? 'bg-orange-500 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
              >
                {category.main}
              </button>
            {/each}
          </div>

          {#if selectedMainCategory}
            <div class="mt-3 flex flex-wrap gap-2">
              {#each categories.find(c => c.main === selectedMainCategory)?.subcategories ?? [] as sub}
                {#each sub.subcategories as subcategory}
                  <button
                    on:click={() => selectSubCategory(subcategory)}
                    class="px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
                      {selectedSubCategory === subcategory 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
                  >
                    {subcategory}
                  </button>
                {/each}
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <!-- Products Grid -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {#each filteredItems as item (item.id)}
          <div 
            role="button"
            tabindex="0"
            on:click={() => window.location.href = `/product/${item.id}`}
            class="group bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden border border-gray-100 hover:border-orange-200"
          >
            <div class="aspect-square bg-gray-50 relative overflow-hidden">
              <div class="absolute inset-0 z-0">
                <img 
                  src={item.thumbnail} 
                  alt={item.itemName} 
                  class="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105" 
                />
                <div class="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
              </div>
              <button
                on:click|stopPropagation={() => handleAddToCart(item)}
                class="absolute bottom-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-orange-50 transition-all duration-200 hover:scale-110 hover:shadow-lg z-10"
              >
                <span class="material-symbols-outlined text-orange-500 text-lg">add_shopping_cart</span>
              </button>
              <div class="absolute top-2 left-2 z-10">
                <span class="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                  {item.category.split('/')[0]}
                </span>
              </div>
            </div>
            <div class="p-3">
              <h3 class="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-orange-600 transition-colors duration-200">{item.itemName}</h3>
              <div class="mt-2 flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <span class="text-base font-semibold text-orange-500">₱{item.price.toFixed(2)}</span>
                  <span class="text-xs text-gray-400">/ unit</span>
                </div>
                <span class="text-xs text-gray-400 flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">visibility</span>
                  View
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>

      <!-- Empty State -->
      {#if filteredItems.length === 0}
        <div class="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-100">
          <span class="material-symbols-outlined text-gray-400 text-5xl mb-3">search_off</span>
          <p class="text-gray-500 mb-4">No products found matching your criteria</p>
          <button 
            on:click={() => {
              searchQuery = '';
              selectedMainCategory = null;
              selectedSubCategory = null;
              sortBy = 'relevance';
            }}
            class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200 text-sm font-medium"
          >
            Clear Filters
          </button>
        </div>
      {/if}

      <!-- Results Count -->
      {#if filteredItems.length > 0}
        <div class="mt-6 text-sm text-gray-500">
          Showing {filteredItems.length} {filteredItems.length === 1 ? 'product' : 'products'}
        </div>
      {/if}
    </div>
  </div>
</div>
{/if}