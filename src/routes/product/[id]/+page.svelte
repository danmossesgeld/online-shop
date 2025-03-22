<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import { cart, addToCart, cartCount } from '$lib/store/cart';
  import { auth } from '$lib/firebase';
  import { signOut, type User } from 'firebase/auth';
  import { page } from '$app/stores';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { fade, slide } from 'svelte/transition';
  import { writable } from 'svelte/store';
  import { notifications } from '$lib/components/Notification.svelte';

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

  interface Product {
    id: string;
    itemName: string;
    description: string;
    price: number;
    thumbnail: string;
    images?: string[];
    variations?: {
      Color?: string[];
      Memory?: string[];
      Storage?: string[];
    };
    productVariations: ProductVariation[];
    specs?: string[];
    detailedInfo?: string;
  }

  let loading = true;
  let product: Product | null = null;
  let error = '';
  let user: User | null = null;
  let selectedImage = '';
  let selectedVariations: Record<string, string> = {};
  let selectedProductVariation: ProductVariation | null = null;
  let showModal = false;
  let showToast = false;
  let toastMessage = '';

  const db = getFirestore();
  const errorMessage = writable('');

  // Subscribe to auth state changes
  auth.onAuthStateChanged((newUser) => {
    user = newUser;
  });

  onMount(async () => {
    try {
      const productId = $page.params.id;
      if (!productId) {
        error = 'Product ID is required';
        return;
      }

      const docRef = doc(db, 'items', productId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        product = {
          id: productId,
          itemName: data.itemName || '',
          description: data.description || '',
          price: data.price || 0,
          thumbnail: data.thumbnail || '',
          images: Array.isArray(data.images) ? data.images : [],
          variations: data.variations || {},
          productVariations: Array.isArray(data.productVariations) ? data.productVariations : [],
          specs: Array.isArray(data.specs) ? data.specs : [],
          detailedInfo: data.detailedInfo
        };

        selectedImage = product.thumbnail;

        // Initialize selected variations
        if (product.variations) {
          Object.keys(product.variations).forEach(variationType => {
            selectedVariations[variationType] = '';
          });
        }
      } else {
        error = 'Product not found';
        notifications.add('Product not found', 'error');
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      error = 'Failed to load product. Please try again later.';
      notifications.add('Error loading product details', 'error');
    } finally {
      loading = false;
    }
  });

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
    if (!product) return;

    // Check if all variations are selected
    const missingVariations = Object.keys(product.variations || {})
      .filter(type => !selectedVariations[type]);

    if (missingVariations.length > 0) {
      notifications.add('Please select all variations', 'error');
      return;
    }

    // Add to cart with variation details
    const cartItem = {
      id: product.id,
      name: product.itemName,
      price: selectedProductVariation?.price || product.price,
      thumbnail: product.thumbnail,
      variationId: selectedProductVariation?.id,
      variationName: selectedProductVariation?.name,
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
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center p-8">
      <span class="material-symbols-outlined text-5xl text-red-500 mb-4">error</span>
      <h1 class="text-2xl font-semibold text-gray-700 mb-2">Error</h1>
      <p class="text-gray-500 mb-6">{error}</p>
      <a href="/mainpage" class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200">
        <span class="material-symbols-outlined mr-2">arrow_back</span>
        Back to Products
      </a>
    </div>
  </div>
{:else if !user}
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
{:else if product}
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-24">
      <div class="bg-white rounded-xl shadow-sm overflow-hidden">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
          <!-- Product Images -->
          <div class="space-y-4">
            <div class="aspect-square bg-white rounded-lg overflow-hidden border border-gray-100">
              <img
                src={selectedImage || product.thumbnail}
                alt={product.itemName}
                class="w-full h-full object-contain cursor-pointer"
                on:click={() => toggleModal(selectedImage)}
              />
            </div>
            
            {#if product?.images && product.images.length > 0}
              <div class="grid grid-cols-4 gap-2">
                {#if product?.thumbnail}
                  <button
                    class="aspect-square bg-white rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-100"
                    class:ring-2={selectedImage === product?.thumbnail}
                    class:ring-orange-500={selectedImage === product?.thumbnail}
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
                    class="aspect-square bg-white rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-orange-500 border border-gray-100"
                    class:ring-2={selectedImage === image}
                    class:ring-orange-500={selectedImage === image}
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
          <div class="space-y-6">
            <div>
              <h1 class="text-2xl font-bold text-gray-900">{product.itemName}</h1>
              <span class="block text-2xl font-bold text-orange-600 mt-2">
                {formatPrice(selectedProductVariation?.price || product.price)}
              </span>
              <p class="mt-4 text-gray-500">{product.description}</p>
            </div>

            <!-- Specifications -->
            {#if product.specs && product.specs.length > 0}
              <div>
                <h3 class="text-sm font-medium text-gray-900 mb-2">Specifications</h3>
                <ul class="list-disc pl-5 text-sm text-gray-500 space-y-1">
                  {#each product.specs as spec}
                    <li>{spec}</li>
                  {/each}
                </ul>
              </div>
            {/if}

            <!-- Variations -->
            {#if product.variations}
              <div class="space-y-4">
                {#each Object.entries(product.variations) as [variationType, options]}
                  <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">
                      {variationType}
                    </label>
                    <select
                      bind:value={selectedVariations[variationType]}
                      class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200"
                    >
                      <option value="">Select {variationType}</option>
                      {#each options as option}
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
              class="w-full inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg shadow-sm text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              disabled={!product?.variations || Object.keys(product.variations).some(type => !selectedVariations[type])}
            >
              <span class="material-symbols-outlined text-2xl mr-2">shopping_cart</span>
              Add to Cart
            </button>
          </div>
        </div>

        <!-- Product Details Section -->
        <div class="border-t border-gray-200">
          <div class="p-6">
            <!-- Detailed Info -->
            {#if product.detailedInfo}
              <div>
                <h3 class="text-lg font-semibold text-gray-900 mb-3">Product Details</h3>
                <div class="whitespace-pre-line text-sm text-gray-500">
                  {product.detailedInfo}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </main>

    <!-- Modal for Image Enlargement -->
    {#if showModal}
      <div 
        class="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4"
        transition:fade={{ duration: 200 }}
      >
        <button 
          class="absolute inset-0 w-full h-full" 
          aria-label="Close modal" 
          on:click={() => showModal = false}
        ></button>
        <div 
          class="relative bg-white rounded-xl max-w-4xl mx-auto w-full p-2"
          transition:slide={{ duration: 300 }}
        >
          <div class="aspect-square w-full bg-gray-50 rounded-lg">
            <img 
              src={selectedImage} 
              alt={product.itemName} 
              class="w-full h-full object-contain p-4"
              loading="lazy"
            />
          </div>
          <button 
            class="absolute -top-3 -right-3 bg-white text-gray-800 w-8 h-8 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors duration-200" 
            aria-label="Close modal" 
            on:click={() => showModal = false}
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    {/if}

    <!-- Toast Notification -->
    {#if showToast}
      <div 
        class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 z-50 text-sm"
        transition:fade={{ duration: 200 }}
      >
        <span class="material-symbols-outlined text-base">check_circle</span>
        {toastMessage}
      </div>
    {/if}
  </div>
{/if}
