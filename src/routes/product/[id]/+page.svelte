<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, doc, getDoc, collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
  import { cart, addToCart, cartCount } from '$lib/store/cart';
  import { auth } from '$lib/firebase';
  import { signOut, type User } from 'firebase/auth';
  import { page } from '$app/stores';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { fade, slide } from 'svelte/transition';
  import { writable } from 'svelte/store';
  import { notifications } from '$lib/components/Notification.svelte';
  import { goto } from '$app/navigation';
  import { itemsStore, fetchItems } from '$lib/store/items';
  import type { Item } from '$lib/store/items';

  interface VariationOption {
    value: string;
    required?: boolean;
  }

  interface ProductVariation {
    id: string;
    name: string;
    price?: number;
    combinations: Record<string, string>;
  }

  let loading = true;
  let product: Item | null = null;
  let error: string | null = null;
  let user: User | null = null;
  let selectedImage = '';
  let selectedVariations: Record<string, string> = {};
  let selectedProductVariation: ProductVariation | null = null;
  let showModal = false;
  let showToast = false;
  let toastMessage = '';
  let showDetailedInfo = false;
  let similarItems: Item[] = [];

  const db = getFirestore();
  const errorMessage = writable('');

  // Subscribe to auth state changes
  auth.onAuthStateChanged((newUser) => {
    user = newUser;
  });

  // Reactive product ID from URL
  $: productId = $page.params.id;

  // Function to fetch similar items
  const fetchSimilarItems = async (category: string, currentProductId: string) => {
    try {
      const itemsRef = collection(db, 'items');
      // Get the main category from the full category path
      const mainCategory = category.split(' > ')[0];
      const q = query(itemsRef, where('category', '>=', mainCategory), where('category', '<=', mainCategory + '\uf8ff'));
      const querySnapshot = await getDocs(q);
      
      similarItems = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Item))
        .filter(item => item.id !== currentProductId)
        .slice(0, 2); // Only get 1 item temporarily
    } catch (err) {
      console.error('Error fetching similar items:', err);
    }
  };

  // Function to fetch product data
  const fetchProductData = async () => {
    try {
      loading = true;
      error = null;

      // Set up real-time listener for product data
      const unsubscribe = onSnapshot(doc(db, 'items', productId), (productDoc) => {
        if (!productDoc.exists()) {
          error = 'Product not found';
          notifications.add('Product not found', 'error');
          return;
        }

        product = productDoc.data() as Item;
        
        // Fetch similar items from the same category
        if (product.category) {
          const similarQuery = query(
            collection(db, 'items'),
            where('category', '==', product.category)
          );
          
          getDocs(similarQuery).then(similarSnapshot => {
            similarItems = similarSnapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Item))
              .filter(item => item.id !== productId)
              .slice(0, 4); // Limit to 4 similar items
          });
        }

        selectedImage = product.thumbnail;

        // Initialize selected variations
        if (product.variations) {
          Object.keys(product.variations).forEach(variationType => {
            selectedVariations[variationType] = '';
          });
        }

        // Fetch similar items after getting the product
        if (product.category) {
          fetchSimilarItems(product.category, productId);
        }

        loading = false;
      }, (err) => {
        console.error('Error fetching product:', err);
        error = 'Failed to load product. Please try again later.';
        notifications.add('Error loading product details', 'error');
        loading = false;
      });

      // Cleanup subscription when component is destroyed
      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up product listener:', err);
      error = 'Failed to load product. Please try again later.';
      notifications.add('Error loading product details', 'error');
      loading = false;
    }
  };

  // Reactive statement to fetch product data when ID changes
  $: {
    if (productId) {
      fetchProductData();
    }
  }

  $: if (product?.variations) {
    // Check if all variations are selected
    const allVariationsSelected = Object.keys(product.variations).every(
      variationType => selectedVariations[variationType]
    );

    if (allVariationsSelected) {
      // Find matching product variation
      selectedProductVariation = product.productVariations?.find(pv => 
        Object.entries(selectedVariations).every(
          ([key, value]) => pv.combinations[key] === value
        )
      ) || null;
    } else {
      selectedProductVariation = null;
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const handleAddToCart = () => {
    if (!product || !productId) return;

    // Check if all variations are selected
    const missingVariations = Object.keys(product.variations || {})
      .filter(type => !selectedVariations[type]);

    if (missingVariations.length > 0) {
      notifications.add('Please select all variations', 'error');
      return;
    }

    // Add to cart with variation details
    const cartItem = {
      id: productId, // Use the URL parameter ID which is the Firestore document ID
      name: product.itemName,
      price: selectedProductVariation?.price || product.price,
      thumbnail: product.thumbnail,
      selectedVariations: { ...selectedVariations }  // Include all selected variations
    };

    addToCart(cartItem);
    notifications.add('Added to cart', 'success');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
      error = 'Error logging out. Please try again.';
      notifications.add('Error logging out', 'error');
    }
  };

  const toggleModal = (img: string) => {
    selectedImage = img;
    showModal = !showModal;
  };
</script>

{#if loading}
  <LoadingSpinner message="Loading product details..." fullScreen={true} color="orange" />
{:else if error}
  <div class="min-h-screen bg-base-200 flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-error mb-4">error</span>
      <h1 class="text-2xl font-semibold text-base-content mb-2">Error</h1>
      <p class="text-base-content/60 mb-6">{error}</p>
      <a href="/mainpage" class="btn btn-primary">
        <span class="material-symbols-outlined mr-2">arrow_back</span>
        Back to Products
      </a>
    </div>
  </div>
{:else if !user}
  <div class="min-h-screen bg-base-200 flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-base-content/40 mb-4">lock</span>
      <h1 class="text-2xl font-semibold text-base-content mb-2">Please Log In</h1>
      <p class="text-base-content/60 mb-6">You need to be logged in to view this page.</p>
      <a href="/login" class="btn btn-primary">
        <span class="material-symbols-outlined mr-2">login</span>
        Log In
      </a>
    </div>
  </div>
{:else if product}
  <div class="min-h-screen bg-base-200">
    <Navbar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20">
      <div class="card bg-base-100 shadow-xl">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 sm:p-6">
          <!-- Product Images -->
          <div class="space-y-3">
            <div class="aspect-square bg-base-100 rounded-lg overflow-hidden border border-base-300">
              <button
                type="button"
                class="w-full h-full object-contain cursor-pointer p-0 border-none bg-transparent"
                on:click={() => toggleModal(selectedImage)}
              >
                <img
                  src={selectedImage || product.thumbnail}
                  alt={product.itemName}
                  class="w-full h-full object-contain"
                />
              </button>
            </div>
            
            {#if product?.images && product.images.length > 0}
              <div class="grid grid-cols-4 gap-1.5">
                {#if product?.thumbnail}
                  <button
                    class="aspect-square bg-base-100 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary border border-base-300"
                    class:ring-2={selectedImage === product?.thumbnail}
                    class:ring-primary={selectedImage === product?.thumbnail}
                    on:click={() => selectedImage = product?.thumbnail ?? ''}
                  >
                    <img
                      src={product?.thumbnail}
                      alt="Thumbnail"
                      class="w-full h-full object-contain"
                    />
                  </button>
                {/if}
                {#each product.images as image}
                  <button
                    class="aspect-square bg-base-100 rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary border border-base-300"
                    class:ring-2={selectedImage === image}
                    class:ring-primary={selectedImage === image}
                    on:click={() => selectedImage = image}
                  >
                    <img
                      src={image}
                      alt={product.itemName}
                      class="w-full h-full object-contain"
                    />
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          <!-- Product Info -->
          <div class="space-y-4">
            <div>
              <h1 class="text-xl font-bold text-base-content">{product.itemName}</h1>
              <span class="block text-xl font-bold text-primary mt-1">
                {formatPrice(selectedProductVariation?.price || product.price)}
              </span>
              <p class="mt-3 text-sm text-base-content/60">{product.description}</p>
            </div>

            <!-- Specifications -->
            {#if product.specs && product.specs.length > 0}
              <div>
                <h3 class="text-sm font-medium text-base-content mb-1.5">Specifications</h3>
                <ul class="list-disc pl-4 text-sm text-base-content/60 space-y-0.5">
                  {#each product.specs as spec}
                    <li>{spec}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- Variations -->
            {#if product.variations}
              <div class="space-y-3">
                {#each Object.entries(product.variations) as [variationType, options]}
                  <div>
                    <label 
                      for={variationType} 
                      class="block text-sm font-medium text-base-content mb-0.5"
                    >
                      {variationType}
                    </label>
                    <select
                      id={variationType}
                      bind:value={selectedVariations[variationType]}
                      class="select select-bordered w-full"
                    >
                      <option value="">Select {variationType}</option>
                      {#each options || [] as option}
                        <option value={option}>{option}</option>
                      {/each}
                    </select>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- Add to Cart Button -->
            <button
              on:click={handleAddToCart}
              class="btn btn-primary w-full"
              disabled={!product?.variations || Object.keys(product.variations).some(type => !selectedVariations[type])}
            >
              <span class="material-symbols-outlined text-xl mr-2">shopping_cart</span>
              Add to Cart
            </button>
          </div>
        </div>

        <!-- Product Details Section -->
        <div class="divider"></div>
        <div class="p-4 sm:p-6">
          <!-- Detailed Info -->
          {#if product.detailedInfo}
            <div>
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-base font-semibold text-base-content">Product Details</h3>
                <button
                  on:click={() => showDetailedInfo = !showDetailedInfo}
                  class="btn btn-ghost btn-sm text-primary"
                >
                  <span class="material-symbols-outlined text-base">
                    {showDetailedInfo ? 'expand_less' : 'expand_more'}
                  </span>
                  {showDetailedInfo ? 'Show Less' : 'Show More'}
                </button>
              </div>
              <div 
                class="whitespace-pre-line text-sm text-base-content/60 transition-all duration-300"
                class:line-clamp-3={!showDetailedInfo}
              >
                {product.detailedInfo}
              </div>
            </div>
          {/if}

          <!-- Similar Items -->
          {#if similarItems.length > 0}
            <div class="mt-6">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-base font-semibold text-base-content">Similar Items</h3>
                <span class="text-xs text-base-content/50">in {product.category.split(' > ')[0]}</span>
              </div>
              <div class="overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
                <div class="flex gap-3 min-w-max">
                  {#each similarItems as item}
                    <a 
                      href="/product/{item.id}"
                      class="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-300 w-[200px] flex-shrink-0 group"
                    >
                      <div class="relative h-32 w-full overflow-hidden bg-base-200">
                        <div class="w-full h-full flex items-center justify-center">
                          <img
                            src={item.thumbnail}
                            alt={item.itemName}
                            class="w-full h-full object-contain bg-base-100 transform group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <div class="absolute inset-0 bg-base-content/0 group-hover:bg-base-content/5 transition-colors duration-300"></div>
                      </div>
                      <div class="card-body p-2">
                        <h4 class="card-title text-sm text-base-content mb-1 truncate">{item.itemName}</h4>
                        <div class="flex items-center justify-between pt-1 border-t border-base-300">
                          <span class="text-sm font-semibold text-primary">
                            {formatPrice(item.price)}
                          </span>
                          <iconify-icon icon="material-symbols:visibility" class="text-primary text-lg"></iconify-icon>
                        </div>
                      </div>
                    </a>
                  {/each}
                  <!-- Show More Button -->
                  <button 
                    on:click={() => {
                      if (product) {
                        const mainCategory = product.category.split(' > ')[0];
                        goto(`/mainpage?category=${encodeURIComponent(mainCategory)}`);
                      }
                    }}
                    class="card bg-base-100 shadow-sm hover:shadow-md transition-all duration-300 w-[200px] flex-shrink-0"
                  >
                    <div class="card-body p-4 text-center">
                      <iconify-icon icon="material-symbols:arrow-forward" class="text-3xl text-primary mb-2"></iconify-icon>
                      <p class="text-sm font-medium text-base-content">Show More</p>
                      <p class="text-xs text-base-content/50 mt-1">View all {product?.category.split(' > ')[0]} items</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </main>

    <!-- Modal for Image Enlargement -->
    {#if showModal}
      <div 
        class="fixed inset-0 bg-base-content/75 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        transition:fade={{ duration: 200 }}
      >
        <button 
          class="absolute inset-0 w-full h-full" 
          aria-label="Close modal" 
          on:click={() => showModal = false}
        ></button>
        <div 
          class="card bg-base-100 max-w-4xl mx-auto w-full p-2"
          transition:slide={{ duration: 300 }}
        >
          <div class="aspect-square w-full bg-base-200 rounded-lg">
            <img 
              src={selectedImage} 
              alt={product.itemName} 
              class="w-full h-full object-contain p-4"
              loading="lazy"
            />
          </div>
          <button 
            class="btn btn-circle btn-ghost absolute -top-3 -right-3" 
            aria-label="Close modal" 
            on:click={() => showModal = false}
          >
            <iconify-icon icon="material-symbols:close" class="text-lg"></iconify-icon>
          </button>
        </div>
      </div>
    {/if}

    <!-- Toast Notification -->
    {#if showToast}
      <div 
        class="toast toast-end"
        transition:fade={{ duration: 200 }}
      >
        <div class="alert alert-success">
          <span class="material-symbols-outlined text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      </div>
    {/if}
  </div>
{/if}
