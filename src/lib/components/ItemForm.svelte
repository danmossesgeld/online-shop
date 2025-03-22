<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
  import { db } from '$lib/firebase';
  import { collection, getDocs, type DocumentData } from 'firebase/firestore';
  import { notifications } from '$lib/components/Notification.svelte';

  const dispatch = createEventDispatcher();

  // Define strict types
  interface ItemData {
    itemName: string;
    price: number;
    stock: number;
    category: string;
    thumbnail: string | null;
    images: string[];
    variations: Record<string, string[]>;
    specs: string[];
    detailedInfo: string;
  }

  interface CategoryData {
    [key: string]: Record<string, string[]>;
  }

  // Props with strict types
  export let mode: 'create' | 'edit' = 'create';
  export let itemId: string | null = null;
  export let initialData: Partial<ItemData> = {};

  // Form state with strict types
  let itemName = initialData.itemName || '';
  let price = initialData.price || 0;
  let stock = initialData.stock || 0;
  let category = initialData.category || '';
  let detailedInfo = initialData.detailedInfo || '';

  // Category selection state with strict types
  let categoryData: CategoryData = {};
  let selectedMainCategory = '';
  let selectedSubCategory = '';
  let selectedThirdCategory = '';
  let subCategories: string[] = [];
  let thirdCategories: string[] = [];

  // File state with strict types
  let thumbnail: File | null = null;
  let images: File[] = [];
  let currentThumbnailUrl = initialData.thumbnail || '';
  let currentImageUrls = initialData.images || [];
  let variations: Record<string, string[]> = initialData.variations || {};
  let specs: string[] = initialData.specs || [];

  // Store state
  const error = writable('');
  const successMessage = writable('');
  const storage = getStorage();

  // Initialize category selection from initialData
  onMount(async () => {
    if (initialData.category) {
      const [main, sub, third] = initialData.category.split(' > ').map(c => c.trim());
      selectedMainCategory = main || '';
      selectedSubCategory = sub || '';
      selectedThirdCategory = third || '';
    }
    await loadCategories();
  });

  // Load categories from Firestore with better error handling
  async function loadCategories(): Promise<void> {
    try {
      const querySnapshot = await getDocs(collection(db, 'itemcategory'));
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Record<string, string[]>;
        categoryData[doc.id] = data;
      });
      
      if (selectedMainCategory) {
        handleMainCategoryChange();
      }
    } catch (err) {
      console.error('Error loading categories:', err);
      notifications.add('Error loading categories. Please try again.', 'error');
    }
  }

  // Handle category changes with better type safety
  function handleMainCategoryChange(): void {
    if (selectedMainCategory && categoryData[selectedMainCategory]) {
      subCategories = Object.entries(categoryData[selectedMainCategory])
        .filter(([_, value]) => Array.isArray(value))
        .map(([key]) => key);

      if (!subCategories.includes(selectedSubCategory)) {
        selectedSubCategory = '';
        selectedThirdCategory = '';
      } else {
        handleSubCategoryChange();
      }
    } else {
      subCategories = [];
      thirdCategories = [];
      selectedSubCategory = '';
      selectedThirdCategory = '';
    }
    updateCategoryString();
  }

  function handleSubCategoryChange(): void {
    if (selectedMainCategory && selectedSubCategory && categoryData[selectedMainCategory]) {
      const arrayField = categoryData[selectedMainCategory][selectedSubCategory];
      thirdCategories = Array.isArray(arrayField) ? arrayField : [];
      
      if (!thirdCategories.includes(selectedThirdCategory)) {
        selectedThirdCategory = '';
      }
    } else {
      thirdCategories = [];
      selectedThirdCategory = '';
    }
    updateCategoryString();
  }

  function updateCategoryString(): void {
    const parts = [
      selectedMainCategory,
      selectedSubCategory,
      selectedThirdCategory
    ].filter(Boolean);
    category = parts.join(' > ');
  }

  // File handling functions with better error handling
  const handleRemoveThumbnail = async (): Promise<void> => {
    try {
      if (currentThumbnailUrl) {
        const imageRef = ref(storage, currentThumbnailUrl);
        await deleteObject(imageRef);
        currentThumbnailUrl = '';
      }
    } catch (err) {
      console.error('Error deleting thumbnail:', err);
      notifications.add('Error deleting thumbnail. Please try again.', 'error');
    }
  };

  const handleRemoveImage = async (index: number): Promise<void> => {
    try {
      const imageUrl = currentImageUrls[index];
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        currentImageUrls = currentImageUrls.filter((_, i) => i !== index);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      notifications.add('Error deleting image. Please try again.', 'error');
    }
  };

  const handleFileChange = (e: Event): void => {
    const target = e.target as HTMLInputElement;
    if (target?.files) {
      if (target.id === 'thumbnail') {
        thumbnail = target.files[0] || null;
      } else if (target.id === 'images') {
        images = Array.from(target.files);
      }
    }
  };

  // Variations handlers with better type safety
  const addVariation = (): void => {
    const newKey = `Variation ${Object.keys(variations).length + 1}`;
    variations = { ...variations, [newKey]: [] };
  };

  const handleVariationCategoryChange = (oldKey: string, newKey: string): void => {
    if (newKey.trim() !== '' && newKey !== oldKey) {
      const values = variations[oldKey] || [];
      const newVariations = { ...variations };
      delete newVariations[oldKey];
      newVariations[newKey] = values;
      variations = newVariations;
    }
  };

  const handleVariationValueChange = (category: string, index: number, newValue: string): void => {
    const values = variations[category] ? [...variations[category]] : [];
    values[index] = newValue;
    variations = { ...variations, [category]: values };
  };

  const handleAddVariationValue = (category: string): void => {
    const values = variations[category] ? [...variations[category]] : [];
    values.push('');
    variations = { ...variations, [category]: values };
  };

  const handleVariationRemove = (category: string, index: number): void => {
    const values = variations[category] ? [...variations[category]] : [];
    values.splice(index, 1);
    variations = { ...variations, [category]: values };
  };

  // Specifications handlers with better type safety
  const addSpec = (): void => {
    specs = [...specs, ''];
  };

  const handleSpecChange = (index: number, newValue: string): void => {
    specs[index] = newValue;
    specs = [...specs];
  };

  const removeSpec = (index: number): void => {
    specs.splice(index, 1);
    specs = [...specs];
  };

  // Form submission with better validation and error handling
  const handleSubmit = async (): Promise<void> => {
    // Validate required fields
    if (!itemName || !price || !stock || !category) {
      notifications.add('Please fill in all required fields.', 'error');
      return;
    }

    // Validate images
    if (!thumbnail && !currentThumbnailUrl) {
      notifications.add('Please upload a thumbnail image.', 'error');
      return;
    }

    if (images.length === 0 && currentImageUrls.length === 0) {
      notifications.add('Please upload at least one product image.', 'error');
      return;
    }

    // Validate variations
    for (const [key, values] of Object.entries(variations)) {
      if (values.length === 0) {
        notifications.add(`Please add values for the "${key}" variation.`, 'error');
        return;
      }
      if (values.some(v => !v.trim())) {
        notifications.add(`Please fill in all values for the "${key}" variation.`, 'error');
        return;
      }
    }

    try {
      let thumbnailURL = currentThumbnailUrl;
      let imageURLs = [...currentImageUrls];

      // Upload new thumbnail if provided
      if (thumbnail) {
        const timestamp = Date.now();
        const thumbnailFilename = `${itemId || 'new'}_${timestamp}_thumbnail${thumbnail.name.substring(thumbnail.name.lastIndexOf('.'))}`;
        const thumbnailRef = ref(storage, `thumbnails/${thumbnailFilename}`);
        await uploadBytes(thumbnailRef, thumbnail);
        thumbnailURL = await getDownloadURL(thumbnailRef);
      }

      // Upload new images if provided
      if (images.length > 0) {
        imageURLs = [];
        for (let i = 0; i < images.length; i++) {
          const image = images[i];
          const timestamp = Date.now();
          const imageFilename = `${itemId || 'new'}_${timestamp}_${i}${image.name.substring(image.name.lastIndexOf('.'))}`;
          const imageRef = ref(storage, `images/${imageFilename}`);
          await uploadBytes(imageRef, image);
          const imageURL = await getDownloadURL(imageRef);
          imageURLs.push(imageURL);
        }
      }

      // Prepare item data
      const itemData: ItemData = {
        itemName,
        price,
        stock,
        category,
        thumbnail: thumbnailURL,
        images: imageURLs,
        variations,
        specs,
        detailedInfo
      };

      // Dispatch the submit event with the item data
      dispatch('submit', itemData);
    } catch (err) {
      console.error('Error submitting form:', err);
      notifications.add('Error submitting form. Please try again.', 'error');
    }
  };
</script>

<div class="space-y-4">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <!-- Basic Information Section -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Item Name -->
      <div>
        <label for="itemName" class="block text-sm font-medium text-gray-700">Item Name</label>
        <input
          id="itemName"
          type="text"
          bind:value={itemName}
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
          required
        />
      </div>

      <!-- Category Selection -->
      <div class="space-y-2">
        <label class="block text-sm font-medium text-gray-700">Category</label>
        <div class="grid grid-cols-1 gap-2">
          <!-- Main Category -->
          <select
            bind:value={selectedMainCategory}
            on:change={handleMainCategoryChange}
            class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
            required
          >
            <option value="">Select Main Category</option>
            {#each Object.keys(categoryData) as mainCat}
              <option value={mainCat}>{mainCat}</option>
            {/each}
          </select>

          <!-- Sub Category -->
          {#if subCategories.length > 0}
            <select
              bind:value={selectedSubCategory}
              on:change={handleSubCategoryChange}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
            >
              <option value="">Select Sub Category (Optional)</option>
              {#each subCategories as subCat}
                <option value={subCat}>{subCat}</option>
              {/each}
            </select>
          {/if}

          <!-- Third Category -->
          {#if thirdCategories.length > 0}
            <select
              bind:value={selectedThirdCategory}
              on:change={updateCategoryString}
              class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
            >
              <option value="">Select Third Category (Optional)</option>
              {#each thirdCategories as thirdCat}
                <option value={thirdCat}>{thirdCat}</option>
              {/each}
            </select>
          {/if}
        </div>
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
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
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
          class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
          required
        />
      </div>
    </div>

    <!-- Images Section -->
    <div class="space-y-3">
      <h3 class="text-base font-bold text-gray-900">Images</h3>
      <div class="grid grid-cols-2 gap-4">
        <!-- Thumbnail Section -->
        <div>
          {#if currentThumbnailUrl}
            <div class="mb-2">
              <p class="text-xs font-medium text-gray-500 mb-1">Current Thumbnail</p>
              <div class="relative group">
                <img
                  src={currentThumbnailUrl}
                  alt="Current thumbnail"
                  class="h-20 w-20 object-cover rounded-lg"
                />
                {#if mode === 'edit'}
                  <button
                    type="button"
                    on:click={handleRemoveThumbnail}
                    class="absolute -top-1 -left-1 bg-red-500 text-white w-5 h-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 flex items-center justify-center"
                  >
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                {/if}
              </div>
            </div>
          {/if}

          <!-- Thumbnail Upload -->
          <div>
            <label for="thumbnail" class="block text-sm font-medium text-gray-700">
              {currentThumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail Image'}
            </label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">image</span>
              <input
                type="file"
                id="thumbnail"
                accept="image/*"
                on:change={handleFileChange}
                class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 pl-12"
              />
            </div>
          </div>
        </div>

        <!-- Additional Images Section -->
        <div>
          {#if currentImageUrls.length > 0}
            <div class="mb-2">
              <p class="text-xs font-medium text-gray-500 mb-1">Current Product Images</p>
              <div class="flex gap-2 overflow-x-auto pb-2">
                {#each currentImageUrls as imageUrl, index}
                  <div class="relative group">
                    <img
                      src={imageUrl}
                      alt="Product image"
                      class="h-20 w-20 object-cover rounded-lg"
                    />
                    {#if mode === 'edit'}
                      <button
                        type="button"
                        on:click={() => handleRemoveImage(index)}
                        class="absolute bottom-0 left-0 right-0 bg-red-500 text-white text-xs py-1 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                      >
                        Remove
                      </button>
                    {/if}
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Images Upload -->
          <div>
            <label for="images" class="block text-sm font-medium text-gray-700">
              {currentImageUrls.length > 0 ? 'Add More Product Images' : 'Upload Product Images'}
            </label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">photo_library</span>
              <input
                type="file"
                id="images"
                accept="image/*"
                multiple
                on:change={handleFileChange}
                class="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 pl-12"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Variations and Specifications Section -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Variations Section -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-bold text-gray-900">Product Variations</h3>
          <button
            type="button"
            on:click={addVariation}
            class="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-sm">add</span>
            Add Variation
          </button>
        </div>

        {#each Object.entries(variations) as [category, values]}
          <div class="bg-gray-50 p-3 rounded-lg space-y-2">
            <div class="flex items-center gap-2">
              <input
                type="text"
                value={category}
                on:input={(e) => {
                  const target = e.target as HTMLInputElement;
                  handleVariationCategoryChange(category, target.value);
                }}
                placeholder="Variation name (e.g., Size, Color)"
                class="text-sm rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500 bg-gray-700 text-white placeholder-gray-400"
              />
              <button
                type="button"
                on:click={() => {
                  const newVariations = { ...variations };
                  delete newVariations[category];
                  variations = newVariations;
                }}
                class="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-full transition-colors duration-200"
              >
                <span class="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <div class="space-y-2">
              {#each values as value, index}
                <div class="flex items-center gap-2">
                  <input
                    type="text"
                    bind:value={values[index]}
                    on:input={(e) => {
                      const target = e.target as HTMLInputElement;
                      handleVariationValueChange(category, index, target.value);
                    }}
                    placeholder="Value"
                    class="text-sm rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                  />
                  <button
                    type="button"
                    on:click={() => handleVariationRemove(category, index)}
                    class="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-full transition-colors duration-200"
                  >
                    <span class="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              {/each}

              <button
                type="button"
                on:click={() => handleAddVariationValue(category)}
                class="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <span class="material-symbols-outlined text-sm">add</span>
                Add Value
              </button>
            </div>
          </div>
        {/each}
      </div>

      <!-- Specifications Section -->
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <h3 class="text-base font-bold text-gray-900">Product Specifications</h3>
          <button
            type="button"
            on:click={addSpec}
            class="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span class="material-symbols-outlined text-sm">add</span>
            Add Specification
          </button>
        </div>

        {#each specs as spec, index}
          <div class="flex items-start gap-2">
            <button
              type="button"
              on:click={() => removeSpec(index)}
              class="text-red-500 hover:text-red-600 p-1 hover:bg-red-50 rounded-full transition-colors duration-200 mt-2"
            >
              <span class="material-symbols-outlined text-sm">close</span>
            </button>
            <textarea
              bind:value={specs[index]}
              on:input={(e) => {
                const target = e.target as HTMLTextAreaElement;
                handleSpecChange(index, target.value);
              }}
              placeholder="Specification"
              rows="2"
              class="flex-1 text-sm rounded-md border-gray-300 focus:border-orange-500 focus:ring-orange-500 resize-none"
            ></textarea>
          </div>
        {/each}
      </div>
    </div>

    <!-- Detailed Information Section -->
    <div class="space-y-2">
      <h3 class="text-base font-bold text-gray-900">Detailed Information</h3>
      <textarea
        bind:value={detailedInfo}
        rows="5"
        placeholder="Enter detailed product information..."
        class="block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
      ></textarea>
    </div>

    <!-- Submit Button -->
    <div class="flex justify-end">
      <button
        type="submit"
        class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 text-sm font-medium flex items-center gap-2"
      >
        <span class="material-symbols-outlined text-sm">save</span>
        {mode === 'create' ? 'Create' : 'Update'} Item
      </button>
    </div>
  </form>
</div> 