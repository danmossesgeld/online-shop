<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { getFirestore, doc, getDoc, updateDoc, query, collection, getDocs, where } from 'firebase/firestore';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth, db } from '$lib/firebase';
  import { page } from '$app/stores';

  // Authentication check
  let user: any = null;
  let authLoading = true;
  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        goto('/login');
      } else {
        user = currentUser;
        loadItem();
      }
      authLoading = false;
    });
    return unsubscribe;
  });

  let itemName = '';
  let price = 0;
  let stock = 0;
  let category = '';
  let thumbnail: File | null = null;
  let images: File[] = [];
  let currentThumbnailUrl = '';
  let currentImageUrls: string[] = [];
  let variations: Record<string, string[]> = {};
  let specs: string[] = [];

  const error = writable('');
  const successMessage = writable('');
  const storage = getStorage();

  // Load existing item data
  async function loadItem() {
    try {
      const id = $page.params.id;
      
      // First try with the route ID
      let itemDoc = await getDoc(doc(db, 'items', id));
      
      if (!itemDoc.exists()) {
        // If not found, try querying by itemId field
        const q = query(collection(db, 'items'), where('itemId', '==', id));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          error.set('Item not found');
          return;
        }
        
        itemDoc = querySnapshot.docs[0];
      }

      const data = itemDoc.data();
      if (!data) {
        error.set('Item data is missing');
        return;
      }

      // Type assertion for the data structure
      interface ItemData {
        itemName: string;
        price: number;
        stock: number;
        category: string;
        thumbnail: string;
        images?: string[];
        variations?: Record<string, string[]>;
        specs?: string[];
      }

      // Set values with type safety and defaults
      itemName = (data as ItemData).itemName || '';
      price = (data as ItemData).price || 0;
      stock = (data as ItemData).stock || 0;
      category = (data as ItemData).category || '';
      currentThumbnailUrl = (data as ItemData).thumbnail || '';
      currentImageUrls = (data as ItemData).images || [];
      variations = (data as ItemData).variations || {};
      specs = (data as ItemData).specs || [];
    } catch (err) {
      error.set('Error loading item: ' + (err as Error).message);
    }
  }

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target && target.files) {
      if (target.id === 'thumbnail') {
        thumbnail = target.files[0];
      } else if (target.id === 'images') {
        images = Array.from(target.files);
      }
    }
  };

  // Variations handlers
  const addVariation = () => {
    const newKey = `Variation ${Object.keys(variations).length + 1}`;
    variations = { ...variations, [newKey]: [] };
  };

  const handleVariationCategoryChange = (oldKey: string, newKey: string) => {
    if (newKey.trim() !== '' && newKey !== oldKey) {
      const values = variations[oldKey] || [];
      const newVariations = { ...variations };
      delete newVariations[oldKey];
      newVariations[newKey] = values;
      variations = newVariations;
    }
  };

  const handleVariationValueChange = (category: string, index: number, newValue: string) => {
    const values = variations[category] ? [...variations[category]] : [];
    values[index] = newValue;
    variations = { ...variations, [category]: values };
  };

  const handleAddVariationValue = (category: string) => {
    const values = variations[category] ? [...variations[category]] : [];
    values.push('');
    variations = { ...variations, [category]: values };
  };

  const handleVariationRemove = (category: string, index: number) => {
    const values = variations[category] ? [...variations[category]] : [];
    values.splice(index, 1);
    variations = { ...variations, [category]: values };
  };

  // Specifications handlers
  const addSpec = () => {
    specs = [...specs, ''];
  };

  const handleSpecChange = (index: number, newValue: string) => {
    specs[index] = newValue;
    specs = [...specs];
  };

  const removeSpec = (index: number) => {
    specs.splice(index, 1);
    specs = [...specs];
  };

  const handleSubmit = async () => {
    const itemId = $page.params.id;

    // Validate variations
    for (const key in variations) {
      if (variations[key].length === 0) {
        error.set(`Please add values for the "${key}" variation.`);
        return;
      }
    }

    if (!itemName || !price || !stock || !category) {
      error.set('Please fill in all required fields.');
      return;
    }

    try {
      let thumbnailURL = currentThumbnailUrl;
      let imageURLs = [...currentImageUrls];

      // Upload new thumbnail if provided
      if (thumbnail) {
        const thumbnailRef = ref(storage, `thumbnails/${itemId}_thumbnail`);
        await uploadBytes(thumbnailRef, thumbnail);
        thumbnailURL = await getDownloadURL(thumbnailRef);
      }

      // Upload new images if provided
      if (images.length > 0) {
        imageURLs = [];
        for (let i = 0; i < images.length; i++) {
          const imageRef = ref(storage, `items/${itemId}_image_${i}`);
          await uploadBytes(imageRef, images[i]);
          const imageURL = await getDownloadURL(imageRef);
          imageURLs.push(imageURL);
        }
      }

      // Update item in Firestore
      await updateDoc(doc(db, 'items', itemId), {
        itemName,
        price,
        stock,
        category,
        thumbnail: thumbnailURL,
        images: imageURLs,
        variations,
        specs,
        updatedAt: new Date(),
      });

      successMessage.set('Item updated successfully!');
      setTimeout(() => goto('/userdashboard/items'), 1500);
    } catch (err) {
      error.set('Error updating item: ' + (err as Error).message);
    }
  };
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold">Edit Item</h2>
      <button
        on:click={() => goto('/userdashboard/items')}
        class="text-gray-600 hover:text-gray-800"
      >
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>

    {#if $error}
      <div class="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
        <p class="flex items-center">
          <span class="material-symbols-outlined mr-2">error</span>
          {$error}
        </p>
      </div>
    {/if}

    {#if $successMessage}
      <div class="bg-green-50 text-green-500 p-4 rounded-lg mb-6">
        <p class="flex items-center">
          <span class="material-symbols-outlined mr-2">check_circle</span>
          {$successMessage}
        </p>
      </div>
    {/if}

    <form on:submit|preventDefault={handleSubmit} class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Item Name -->
        <div>
          <label for="itemName" class="block text-sm font-medium text-gray-700">Item Name</label>
          <input
            id="itemName"
            type="text"
            bind:value={itemName}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <!-- Category -->
        <div>
          <label for="category" class="block text-sm font-medium text-gray-700">Category</label>
          <input
            id="category"
            type="text"
            bind:value={category}
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <!-- Price -->
        <div>
          <label for="price" class="block text-sm font-medium text-gray-700">Price</label>
          <input
            id="price"
            type="number"
            bind:value={price}
            min="0"
            step="0.01"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>

        <!-- Stock -->
        <div>
          <label for="stock" class="block text-sm font-medium text-gray-700">Stock</label>
          <input
            id="stock"
            type="number"
            bind:value={stock}
            min="0"
            class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
            required
          />
        </div>
      </div>

      <!-- Images Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-gray-900">Images</h3>
        
        <!-- Current Thumbnail -->
        {#if currentThumbnailUrl}
          <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Current Thumbnail</p>
            <img src={currentThumbnailUrl} alt="Current thumbnail" class="h-24 w-24 object-cover rounded-lg" />
          </div>
        {/if}

        <!-- Thumbnail Upload -->
        <div>
          <label for="thumbnail" class="block text-sm font-medium text-gray-700">
            {currentThumbnailUrl ? 'Change Thumbnail' : 'Thumbnail'}
          </label>
          <input
            id="thumbnail"
            type="file"
            accept="image/*"
            on:change={handleFileChange}
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
          />
        </div>

        <!-- Current Images -->
        {#if currentImageUrls.length > 0}
          <div class="mb-4">
            <p class="text-sm font-medium text-gray-700 mb-2">Current Images</p>
            <div class="grid grid-cols-4 gap-4">
              {#each currentImageUrls as imageUrl}
                <img src={imageUrl} alt="Product image" class="h-24 w-24 object-cover rounded-lg" />
              {/each}
            </div>
          </div>
        {/if}

        <!-- Additional Images Upload -->
        <div>
          <label for="images" class="block text-sm font-medium text-gray-700">
            {currentImageUrls.length > 0 ? 'Change Additional Images' : 'Additional Images'}
          </label>
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            on:change={handleFileChange}
            class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
          />
        </div>
      </div>

      <!-- Specifications -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Specifications</h3>
          <button
            type="button"
            on:click={addSpec}
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <span class="material-symbols-outlined mr-1">add</span>
            Add Spec
          </button>
        </div>

        {#each specs as spec, i}
          <div class="flex items-center gap-2 mb-2">
            <input
              type="text"
              value={spec}
              on:input={(e) => handleSpecChange(i, (e.target as HTMLInputElement).value)}
              class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
              placeholder="Enter a specification"
            />
            <button
              type="button"
              on:click={() => removeSpec(i)}
              class="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-50"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        {/each}
      </div>

      <!-- Variations -->
      <div>
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-medium text-gray-900">Variations</h3>
          <button
            type="button"
            on:click={addVariation}
            class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <span class="material-symbols-outlined mr-1">add</span>
            Add Variation
          </button>
        </div>

        {#each Object.entries(variations) as [key, values]}
          <div class="bg-gray-50 p-4 rounded-lg mb-4">
            <div class="flex items-center gap-2 mb-4">
              <input
                type="text"
                value={key}
                on:input={(e) => handleVariationCategoryChange(key, (e.target as HTMLInputElement).value)}
                class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                placeholder="Variation name (e.g., Color)"
              />
              <button
                type="button"
                on:click={() => handleAddVariationValue(key)}
                class="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-full shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <span class="material-symbols-outlined mr-1">add</span>
                Add Value
              </button>
            </div>

            {#each values as value, index}
              <div class="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  value={value}
                  on:input={(e) => handleVariationValueChange(key, index, (e.target as HTMLInputElement).value)}
                  class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500"
                  placeholder={`Value for ${key}`}
                />
                <button
                  type="button"
                  on:click={() => handleVariationRemove(key, index)}
                  class="inline-flex items-center p-2 border border-transparent rounded-full text-red-600 hover:bg-red-50"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
            {/each}
          </div>
        {/each}
      </div>

      <!-- Submit Button -->
      <div class="flex justify-end pt-6">
        <button
          type="submit"
          class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <span class="material-symbols-outlined mr-2">save</span>
          Save Changes
        </button>
      </div>
    </form>
  </div>
</div> 