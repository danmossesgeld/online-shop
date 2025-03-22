<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, doc, getDoc } from 'firebase/firestore';
  import { cart, addToCart, getCartItemCount } from '$lib/store/cart';
  import { auth } from '$lib/firebase';
  import { signOut, type User } from 'firebase/auth';
  import { page } from '$app/stores';
  import Navbar from '../../../components/Navbar.svelte';
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
            variations: data.variations || {}
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
    <div class="pt-16 p-4 max-w-5xl mx-auto space-y-8">
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
                loading="lazy"
              />
              <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300 flex items-center justify-center">
                <span class="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-3xl">
                  zoom_in
                </span>
              </div>
            </button>
          </div>
          <div class="flex gap-2 overflow-x-auto pb-2">
            {#each product.images as img}
              <button 
                type="button" 
                class="p-0 border-none flex-shrink-0 transition-all duration-300 hover:scale-105 aspect-square" 
                on:click={() => selectedImage = img}
              >
                <img 
                  src={img} 
                  alt="Thumbnail" 
                  class="w-16 h-16 object-contain cursor-pointer rounded-lg border-2 transition-all duration-300 bg-white"
                  class:border-orange-500={selectedImage === img}
                  loading="lazy"
                />
              </button>
            {/each}
          </div>
        </div>

        <!-- Right Column: Product Details -->
        <div class="space-y-6">
          <div>
            <h1 class="text-3xl font-bold text-gray-900">{product.itemName}</h1>
            <p class="text-xl font-semibold text-orange-500 mt-2">₱{product.price.toFixed(2)}</p>
          </div>

          <!-- Variations -->
          {#if Object.keys(product.variations).length > 0}
            <div class="space-y-4">
              <h2 class="text-lg font-semibold text-gray-800">Select Options</h2>
              {#each Object.entries(product.variations) as [category, options]}
                <div>
                  <h3 class="font-medium text-gray-700 mb-2">{category}</h3>
                  <div class="flex flex-wrap gap-2">
                    {#each options as option}
                      <button 
                        class="px-4 py-2 rounded-full border-2 transition-all duration-300 hover:border-orange-500 hover:text-orange-500 text-sm"
                        class:border-orange-500={selectedVariations[category] === option}
                        class:text-orange-500={selectedVariations[category] === option}
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
            class="w-full bg-orange-500 text-white py-3 px-6 rounded-lg text-base font-semibold transition-all duration-300 hover:bg-orange-600 hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-xl">shopping_cart</span>
            Add to Cart
          </button>
        </div>
      </div>

      <!-- Product Specifications -->
      {#if product.specs.length > 0}
        <div class="mt-8 bg-white rounded-xl p-6 shadow-md">
          <h2 class="text-xl font-semibold text-gray-900 mb-4">Specifications</h2>
          <ul class="space-y-3">
            {#each product.specs as spec}
              <li class="flex items-start gap-2">
                <span class="material-symbols-outlined text-orange-500 mt-0.5 text-lg">check_circle</span>
                <span class="text-gray-700 text-sm">{spec}</span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
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
              loading="lazy"
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

    <!-- Toast Notification -->
    {#if showToast}
      <div 
        class="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50"
        transition:fade={{ duration: 200 }}
      >
        <span class="material-symbols-outlined">check_circle</span>
        {toastMessage}
      </div>
    {/if}
  </div>
{/if}
