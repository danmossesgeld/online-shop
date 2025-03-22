<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import { cart, addToCart, getCartItemCount } from '$lib/store/cart';
  import { auth } from '$lib/firebase';
  import { signOut, type User } from 'firebase/auth';
  import { page } from '$app/stores';
  import Navbar from '../../Navbar.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { fade, slide } from 'svelte/transition';

  type Product = {
      id?: string;
      itemName?: string;
      price?: number;
      thumbnail?: string;
      images?: string[];
      specs?: string[];
      variations?: Record<string, string[]>;
  };

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
      const fetchData = async () => {
          const productId = $page.params.id;
          if (productId) {
              try {
                  const docRef = doc(db, 'items', productId);
                  const docSnap = await getDoc(docRef);

                  if (docSnap.exists()) {
                      product = { id: productId, ...docSnap.data() as Product };
                      // Include thumbnail in images array if it's not already there
                      if (product.thumbnail && (!product.images || !product.images.includes(product.thumbnail))) {
                          product.images = [product.thumbnail, ...(product.images || [])];
                      }
                      selectedImage = product.thumbnail || ''; // Default image
                  } else {
                      errorMessage = 'Product not found!';
                  }
              } catch (error) {
                  errorMessage = 'Failed to load product!';
              }
          }
          loading = false;
      };

      fetchData();
  });

  const handleAddToCart = () => {
    if (product) {
      addToCart({
        id: product.id!,
        name: product.itemName!,
        price: product.price!,
        thumbnail: product.thumbnail!,
        variations: selectedVariations
      });

      cartCount = getCartItemCount();
    }
  };

  const handleLogout = async () => {
      try {
          await signOut(auth);
          window.location.href = '/';
      } catch (err) {
          errorMessage = 'Error logging out';
      }
  };

  const toggleModal = (img: string) => {
      selectedImage = img;
      showModal = !showModal;
  };
</script>

{#if loading}
  <LoadingSpinner message="Loading product details..." fullScreen={true} color="orange" />
{:else}
  {#if product}
    <Navbar />
    <div class="min-h-screen bg-gray-50">
      <div class="mt-16 p-4 max-w-5xl mx-auto space-y-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column: Image Section -->
          <div class="space-y-4">
            <div class="relative group aspect-square w-full">
              <button
                type="button"
                class="w-full h-full object-contain rounded-xl shadow-lg cursor-pointer transition-all duration-300 hover:scale-[1.02] p-0 border-none overflow-hidden bg-white"
                on:click={() => toggleModal(selectedImage)}
                on:keydown={(e) => e.key === 'Enter' && toggleModal(selectedImage)}
                aria-label={`View larger image of ${product.itemName}`}
              >
                <img 
                  src={selectedImage} 
                  alt={product.itemName}
                  class="w-full h-full object-contain"
                />
                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                  <span class="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-3xl">
                    zoom_in
                  </span>
                </div>
              </button>
            </div>
            <div class="flex gap-2 overflow-x-auto pb-2">
              {#each product.images ?? [] as img}
                <button 
                  type="button" 
                  class="p-0 border-none flex-shrink-0 transition-all duration-300 hover:scale-105 aspect-square" 
                  on:click={() => selectedImage = img}
                >
                  <img 
                    src={img} 
                    alt="Thumbnail" 
                    class="w-16 h-16 object-contain cursor-pointer rounded-lg border-2 transition-all duration-300 bg-white"
                    class:border-blue-500={selectedImage === img}
                  />
                </button>
              {/each}
            </div>
          </div>

          <!-- Right Column: Product Details -->
          <div class="space-y-6">
            <div>
              <h1 class="text-3xl font-bold text-gray-900">{product.itemName}</h1>
              <p class="text-xl font-semibold text-blue-600 mt-2">${product.price}</p>
            </div>

            <!-- Variations -->
            {#if product.variations && typeof product.variations === 'object'}
              <div class="space-y-4">
                <h2 class="text-lg font-semibold text-gray-800">Select Options</h2>
                {#each Object.entries(product.variations as Record<string, string[]>) as [category, options]}
                  <div>
                    <h3 class="font-medium text-gray-700 mb-2">{category}</h3>
                    <div class="flex flex-wrap gap-2">
                      {#each options as option}
                        <button 
                          class="px-4 py-2 rounded-full border-2 transition-all duration-300 hover:border-blue-500 hover:text-blue-500 text-sm"
                          class:border-blue-500={selectedVariations[category] === option}
                          class:text-blue-500={selectedVariations[category] === option}
                          class:bg-blue-50={selectedVariations[category] === option}
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
              class="w-full bg-blue-600 text-white py-3 px-6 rounded-lg text-base font-semibold transition-all duration-300 hover:bg-blue-700 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-xl">shopping_cart</span>
              Add to Cart
            </button>
          </div>
        </div>

        <!-- Product Specifications -->
        {#if Array.isArray(product.specs) && product.specs.length > 0}
          <div class="mt-8 bg-white rounded-xl p-6 shadow-md">
            <h2 class="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
            <ul class="space-y-3">
              {#each product.specs as spec}
                <li class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-blue-500 mt-0.5 text-lg">check_circle</span>
                  <span class="text-gray-700 text-sm">{spec}</span>
                </li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    </div>

    <!-- Modal for Image Enlargement -->
    {#if showModal}
      <div 
        class="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50"
        transition:fade={{ duration: 200 }}
      >
        <button 
          class="absolute inset-0 w-full h-full" 
          aria-label="Close modal" 
          on:click={() => showModal = false}
        ></button>
        <div 
          class="relative bg-white p-6 rounded-xl max-w-4xl mx-auto w-full"
          transition:slide={{ duration: 300 }}
        >
          <div class="aspect-square w-full">
            <img 
              src={selectedImage} 
              alt={product.itemName} 
              class="w-full h-full object-contain rounded-lg"
            />
          </div>
          <button 
            class="absolute -top-3 -right-3 bg-white text-gray-800 w-7 h-7 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors duration-200" 
            aria-label="Close modal" 
            on:click={() => showModal = false}
          >
            <span class="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      </div>
    {/if}
  {:else}
    <div class="text-center text-red-500 py-10">{errorMessage}</div>
  {/if}
{/if}
