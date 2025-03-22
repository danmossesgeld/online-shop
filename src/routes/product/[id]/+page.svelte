<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import { cart, addToCart, getCartItemCount } from '$lib/store/cart';
  import { auth } from '$lib/firebase';
  import { signOut, type User } from 'firebase/auth';
  import { page } from '$app/stores';
  import Navbar from '$lib/components/Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { fade, slide } from 'svelte/transition';

  interface Product {
    id: string;
    itemName: string;
    price: number;
    thumbnail: string;
    images: string[];
    specs: string[];
    variations: Record<string, string[]>;
    detailedInfo?: string;
  }

  let product: Product | null = null;
  let loading = true;
  let errorMessage = '';
  let user: User | null = null;
  let cartCount = getCartItemCount();
  let selectedImage = ''; // Stores the main image to display
  let selectedVariations: Record<string, string | undefined> = {};
  let showModal = false; // For image modal toggle
  let showToast = false;
  let toastMessage = '';

  const db = getFirestore();

  onMount(() => {
    const unsubscribe = auth.onAuthStateChanged(currentUser => {
      user = currentUser;
    });

    const fetchData = async () => {
      try {
        const productId = $page.params.id;
        if (!productId) {
          throw new Error('Product ID is required');
        }

        const docRef = doc(db, 'items', productId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          product = {
            id: productId,
            itemName: data.itemName || '',
            price: data.price || 0,
            thumbnail: data.thumbnail || '',
            images: data.images || [],
            specs: data.specs || [],
            variations: data.variations || {},
            detailedInfo: data.detailedInfo || ''
          };

          // Include thumbnail in images array if it's not already there
          if (product.thumbnail && !product.images.includes(product.thumbnail)) {
            product.images = [product.thumbnail, ...product.images];
          }
          selectedImage = product.thumbnail;
        } else {
          errorMessage = 'Product not found!';
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        errorMessage = 'Failed to load product. Please try again later.';
      } finally {
        loading = false;
      }
    };

    fetchData();
    return () => unsubscribe();
  });

  const handleAddToCart = () => {
    if (!product) return;

    try {
      // Filter out any undefined variations
      const definedVariations = Object.fromEntries(
        Object.entries(selectedVariations).filter(([_, value]) => value !== undefined)
      ) as Record<string, string>;

      addToCart({
        id: product.id,
        name: product.itemName,
        price: product.price,
        thumbnail: product.thumbnail,
        variations: definedVariations
      });

      cartCount = getCartItemCount();
      showToast = true;
      toastMessage = 'Added to cart successfully!';
      setTimeout(() => showToast = false, 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      errorMessage = 'Failed to add item to cart. Please try again.';
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/';
    } catch (err) {
      console.error('Error logging out:', err);
      errorMessage = 'Error logging out. Please try again.';
    }
  };

  const toggleModal = (img: string) => {
    selectedImage = img;
    showModal = !showModal;
  };
</script>

{#if loading}
  <LoadingSpinner message="Loading product details..." fullScreen={true} color="orange" />
{:else if errorMessage}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center p-8 bg-white rounded-xl shadow-sm max-w-md mx-4">
      <span class="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
      <h1 class="text-2xl font-semibold text-gray-700 mb-2">Error</h1>
      <p class="text-gray-500 mb-6">{errorMessage}</p>
      <a href="/mainpage" class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200">
        <span class="material-symbols-outlined mr-2">arrow_back</span>
        Back to Products
      </a>
    </div>
  </div>
{:else if product}
  <div class="min-h-screen bg-gray-50">
    <Navbar />
    <div class="pt-16 px-4 max-w-6xl mx-auto">
      <!-- Main Content Container -->
      <div class="mt-4">
        <!-- Breadcrumb -->
        <nav class="mb-3 flex items-center space-x-1 text-sm text-gray-500">
          <a href="/mainpage" class="hover:text-orange-500 transition-colors duration-200">Products</a>
          <span class="material-symbols-outlined text-sm">chevron_right</span>
          <span class="text-gray-900">{product.itemName}</span>
        </nav>

        <!-- Main Product Section -->
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
          <div class="grid grid-cols-1 md:grid-cols-2 items-start">
            <!-- Left Column: Image Section -->
            <div class="p-4 md:p-6 bg-gray-50">
              <div class="relative group aspect-square w-full bg-white rounded-lg shadow-sm">
                <button
                  type="button"
                  class="w-full h-full object-contain cursor-pointer transition-all duration-300 hover:scale-[1.02] p-0 border-none overflow-hidden"
                  on:click={() => toggleModal(selectedImage)}
                  on:keydown={(e) => e.key === 'Enter' && toggleModal(selectedImage)}
                  aria-label={`View larger image of ${product.itemName}`}
                >
                  <img 
                    src={selectedImage} 
                    alt={product.itemName}
                    class="w-full h-full object-contain p-2"
                    loading="lazy"
                  />
                  <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all duration-300 flex items-center justify-center rounded-lg">
                    <span class="material-symbols-outlined text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-3xl">
                      zoom_in
                    </span>
                  </div>
                </button>
              </div>
              
              {#if product.images.length > 1}
                <div class="mt-4 flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                  {#each product.images as img}
                    <button 
                      type="button" 
                      class="p-0 border-none flex-shrink-0 transition-all duration-300 hover:scale-105 aspect-square bg-white rounded-lg shadow-sm" 
                      on:click={() => selectedImage = img}
                    >
                      <img 
                        src={img} 
                        alt="Thumbnail" 
                        class="w-14 h-14 object-contain cursor-pointer rounded-lg border-2 transition-all duration-300"
                        class:border-orange-500={selectedImage === img}
                        class:border-transparent={selectedImage !== img}
                        loading="lazy"
                      />
                    </button>
                  {/each}
                </div>
              {/if}
            </div>

            <!-- Right Column: Product Details -->
            <div class="p-4 md:p-6 border-t md:border-t-0 md:border-l border-gray-100">
              <!-- Title and Price -->
              <div class="space-y-3 mb-4">
                <h1 class="text-2xl font-bold text-gray-900 leading-tight">{product.itemName}</h1>
                <p class="text-2xl font-semibold text-orange-500">₱{product.price.toFixed(2)}</p>
                
                <!-- Specifications -->
                {#if product.specs.length > 0}
                  <div class="pt-2">
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {#each product.specs as spec}
                        <div class="flex items-center gap-1.5 bg-gray-50 px-2 py-1.5 rounded">
                          <span class="material-symbols-outlined text-orange-500 text-sm">check_circle</span>
                          <span class="text-gray-600 leading-tight">{spec}</span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Variations -->
              {#if Object.keys(product.variations).length > 0}
                <div class="space-y-3 mb-4">
                  {#each Object.entries(product.variations) as [category, options]}
                    <div>
                      <h3 class="text-sm font-medium text-gray-700 mb-1.5">{category}</h3>
                      <div class="flex flex-wrap gap-1.5">
                        {#each options as option}
                          <button 
                            class="px-3 py-1.5 rounded-full border transition-all duration-200 text-sm"
                            class:border-orange-500={selectedVariations[category] === option}
                            class:border-gray-200={selectedVariations[category] !== option}
                            class:text-orange-500={selectedVariations[category] === option}
                            class:text-gray-700={selectedVariations[category] !== option}
                            class:bg-orange-50={selectedVariations[category] === option}
                            on:click={() => selectedVariations[category] = option}
                          >
                            {option}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Add to Cart Button -->
              <button
                on:click={handleAddToCart}
                class="w-full bg-orange-500 text-white py-2.5 px-6 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-orange-600 hover:shadow-md active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span class="material-symbols-outlined text-lg">shopping_cart</span>
                Add to Cart
              </button>
            </div>
          </div>

          <!-- Product Information -->
          {#if product.detailedInfo}
            <div class="border-t border-gray-100">
              <div class="p-4 md:p-6 bg-gray-50">
                <h2 class="text-lg font-semibold text-gray-900 mb-4">Detailed Information</h2>
                <div class="prose prose-sm max-w-none text-gray-600 whitespace-pre-wrap">
                  {product.detailedInfo}
                </div>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>

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
