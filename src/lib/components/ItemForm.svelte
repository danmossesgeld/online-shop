<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
  import { db } from '$lib/firebase';
  import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore';
  import { notifications } from '$lib/components/Notification.svelte';
  import { updateCartProductDetails } from '$lib/store/cart';

  const dispatch = createEventDispatcher();

  // Define strict types
  interface ItemFormData {
    itemName: string;
    price: number;
    stock: number;
    category: string;
    thumbnail: string;
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
  export let initialData: Partial<ItemFormData> = {};

  // Form state with strict types
  let formState: ItemFormData = {
    itemName: initialData.itemName || '',
    price: initialData.price || 0,
    stock: initialData.stock || 0,
    category: initialData.category || '',
    thumbnail: initialData.thumbnail || '',
    images: initialData.images || [],
    variations: initialData.variations || {},
    specs: initialData.specs || [],
    detailedInfo: initialData.detailedInfo || ''
  };

  // Category selection state
  let categoryData: CategoryData = {};
  let selectedMainCategory = '';
  let selectedSubCategory = '';
  let selectedThirdCategory = '';
  let subCategories: string[] = [];
  let thirdCategories: string[] = [];

  // File state
  let thumbnail: File | null = null;
  let images: File[] = [];

  // UI state
  const error = writable('');
  const successMessage = writable('');
  let isSubmitting = false;
  const storage = getStorage();

  // Watch for initialData changes only once on mount
  onMount(async () => {
    await loadCategories();
    
    // Set up category selection if initial data exists
    if (initialData.category) {
      const [main, sub, third] = initialData.category.split(' > ').map(c => c.trim());
      selectedMainCategory = main || '';
      selectedSubCategory = sub || '';
      selectedThirdCategory = third || '';
      handleMainCategoryChange();
    }
  });

  // Load categories from Firestore
  async function loadCategories() {
    try {
      const querySnapshot = await getDocs(collection(db, 'itemcategory'));
      categoryData = querySnapshot.docs.reduce((acc, doc) => ({
        ...acc,
        [doc.id]: doc.data()
      }), {});
      
      if (selectedMainCategory) {
        handleMainCategoryChange();
      }
    } catch (err) {
      notifications.add('Error loading categories: ' + (err as Error).message, 'error');
    }
  }

  // Category handlers
  function handleMainCategoryChange() {
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

  function handleSubCategoryChange() {
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

  function updateCategoryString() {
    formState.category = [selectedMainCategory, selectedSubCategory, selectedThirdCategory]
      .filter(Boolean)
      .join(' > ');
  }

  // File handlers
  const handleRemoveThumbnail = async () => {
    try {
      if (formState.thumbnail) {
        const imageRef = ref(storage, formState.thumbnail);
        await deleteObject(imageRef);
        formState.thumbnail = '';
      }
    } catch (err) {
      console.error('Error deleting thumbnail:', err);
      notifications.add('Error deleting thumbnail. Please try again.', 'error');
    }
  };

  const handleRemoveImage = async (index: number) => {
    try {
      const imageUrl = formState.images[index];
      if (imageUrl) {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
        formState.images = formState.images.filter((_, i) => i !== index);
      }
    } catch (err) {
      console.error('Error deleting image:', err);
      notifications.add('Error deleting image. Please try again.', 'error');
    }
  };

  const handleFileChange = (e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target?.files) {
      if (target.id === 'thumbnail') {
        thumbnail = target.files[0];
      } else if (target.id === 'images') {
        images = Array.from(target.files);
      }
    }
  };

  // Variations handlers
  const addVariation = () => {
    const newKey = `Variation ${Object.keys(formState.variations).length + 1}`;
    formState.variations = { ...formState.variations, [newKey]: [] };
  };

  const handleRemoveVariation = (category: string) => {
    const { [category]: _, ...rest } = formState.variations;
    formState.variations = rest;
  };

  const handleVariationCategoryChange = (oldKey: string, newKey: string) => {
    if (newKey.trim() && newKey !== oldKey) {
      const values = formState.variations[oldKey] || [];
      const { [oldKey]: _, ...rest } = formState.variations;
      formState.variations = { ...rest, [newKey]: values };
    }
  };

  const handleVariationValueChange = (category: string, index: number, newValue: string) => {
    formState.variations = {
      ...formState.variations,
      [category]: formState.variations[category].map((value, i) => 
        i === index ? newValue : value
      )
    };
  };

  const handleAddVariationValue = (category: string) => {
    formState.variations = {
      ...formState.variations,
      [category]: [...(formState.variations[category] || []), '']
    };
  };

  const handleVariationRemove = (category: string, index: number) => {
    formState.variations = {
      ...formState.variations,
      [category]: formState.variations[category].filter((_, i) => i !== index)
    };
  };

  // Specifications handlers
  const addSpec = () => {
    formState.specs = [...formState.specs, ''];
  };

  const handleSpecChange = (index: number, newValue: string) => {
    formState.specs = formState.specs.map((spec, i) => 
      i === index ? newValue : spec
    );
  };

  const removeSpec = (index: number) => {
    formState.specs = formState.specs.filter((_, i) => i !== index);
  };

  const handleSubmit = async () => {
    // Validate variations
    for (const key in formState.variations) {
      if (formState.variations[key].length === 0) {
        notifications.add(`Please add values for the "${key}" variation.`, 'error');
        return;
      }
    }

    if (!formState.itemName || !formState.price || !formState.stock || !formState.category || (!thumbnail && !formState.thumbnail) || (images.length === 0 && formState.images.length === 0)) {
      notifications.add('Please fill in all required fields and upload images.', 'error');
      return;
    }

    try {
      isSubmitting = true;
      let thumbnailURL = formState.thumbnail;
      let imageURLs = [...formState.images];

      // Upload new thumbnail if provided
      if (thumbnail) {
        const thumbnailRef = ref(storage, `products/${itemId || Date.now()}/thumbnail`);
        await uploadBytes(thumbnailRef, thumbnail);
        thumbnailURL = await getDownloadURL(thumbnailRef);
      }

      // Upload new images if provided
      if (images.length > 0) {
        const uploadPromises = images.map(async (image) => {
          const imageRef = ref(storage, `products/${itemId || Date.now()}/images/${Date.now()}`);
          await uploadBytes(imageRef, image);
          return getDownloadURL(imageRef);
        });
        imageURLs = await Promise.all(uploadPromises);
      }

      // Prepare item data
      const itemData = {
        itemName: formState.itemName,
        price: formState.price,
        stock: formState.stock,
        category: formState.category,
        thumbnail: thumbnailURL,
        images: imageURLs,
        variations: formState.variations,
        specs: formState.specs,
        detailedInfo: formState.detailedInfo,
        ...(mode === 'create' ? { createdAt: new Date() } : { updatedAt: new Date() })
      };

      if (mode === 'create') {
        const docRef = await addDoc(collection(db, 'items'), itemData);
        dispatch('success', { id: docRef.id });
      } else if (itemId) {
        await updateDoc(doc(db, 'items', itemId), itemData);
        
        // Update cart items with new product details
        await updateCartProductDetails(itemId);
        
        dispatch('success', { id: itemId });
      }

      successMessage.set(mode === 'create' ? 'Item created successfully!' : 'Item updated successfully!');
    } catch (err) {
      console.error('Error saving item:', err);
      error.set(err instanceof Error ? err.message : 'Failed to save item');
    } finally {
      isSubmitting = false;
    }
  };
</script>

<div class="space-y-4 bg-gray-50 p-6 rounded-lg shadow-md">
  <form on:submit|preventDefault={handleSubmit} class="space-y-4">
    <!-- Main Details Header -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Item Name -->
      <div>
        <label for="itemName" class="block text-base font-bold text-orange-500">Item Name</label>
        <input
          id="itemName"
          type="text"
          bind:value={formState.itemName}
          class="mt-1 block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
          required
        />
      </div>

      <!-- Category Selection -->
      <div class="space-y-2">
        <!-- svelte-ignore a11y_label_has_associated_control -->
        <label class="block text-base font-bold text-orange-500">Category</label>
        <div class="grid grid-cols-1 gap-2">
          <!-- Main Category -->
          <select
            bind:value={selectedMainCategory}
            on:change={handleMainCategoryChange}
            class="block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
            required
          >
            <option value="">Select Main Category</option>
            {#each Object.keys(categoryData) as mainCat}
              <option value={mainCat}>{mainCat}</option>
            {/each}
          </select>

          <!-- Sub Category (Optional) -->
          {#if subCategories.length > 0}
            <select
              bind:value={selectedSubCategory}
              on:change={handleSubCategoryChange}
              class="block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
            >
              <option value="">Select Sub Category (Optional)</option>
              {#each subCategories as subCat}
                <option value={subCat}>{subCat}</option>
              {/each}
            </select>
          {/if}

          <!-- Third Category (Optional) -->
          {#if thirdCategories.length > 0}
            <select
              bind:value={selectedThirdCategory}
              on:change={updateCategoryString}
              class="block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
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
        <label for="price" class="block text-base font-bold text-orange-500">Price</label>
        <input
          id="price"
          type="number"
          bind:value={formState.price}
          min="0"
          step="0.01"
          class="mt-1 block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
          required
        />
      </div>

      <!-- Stock -->
      <div>
        <label for="stock" class="block text-base font-bold text-orange-500">Stock</label>
        <input
          id="stock"
          type="number"
          bind:value={formState.stock}
          min="0"
          class="mt-1 block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-base"
          required
        />
      </div>
    </div>

    <!-- Images Section -->
    <div class="space-y-3">
      <h3 class="text-base font-bold text-orange-500">Images</h3>

      <div class="grid grid-cols-2 gap-4">
        <!-- Thumbnail Section -->
        <div>
          <!-- Current Thumbnail Preview -->
          {#if formState.thumbnail}
            <div class="mb-2 relative">
              <p class="text-xs font-medium text-gray-600 mb-1">Current Thumbnail</p>
              <div class="relative group">
                <img
                  src={formState.thumbnail}
                  alt="Current thumbnail"
                  class="h-20 w-20 object-cover rounded-lg"
                />
                {#if mode === 'edit'}
                  <button
                    type="button"
                    on:click={handleRemoveThumbnail}
                    class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
              {formState.thumbnail ? 'Change Thumbnail' : 'Thumbnail'}
            </label>
            <input
              type="file"
              id="thumbnail"
              accept="image/*"
              on:change={handleFileChange}
              class="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>
        </div>

        <!-- Additional Images Section -->
        <div>
          <!-- Current Images Preview -->
          {#if formState.images.length > 0}
            <div class="mb-2">
              <p class="text-xs font-medium text-gray-600 mb-1">Current Images</p>
              <div class="flex gap-2 overflow-x-auto pb-2">
                {#each formState.images as imageUrl, index}
                  <div class="relative group">
                    <!-- svelte-ignore a11y_img_redundant_alt -->
                    <img
                      src={imageUrl}
                      alt="Product image"
                      class="h-20 w-20 object-cover rounded-lg flex-shrink-0"
                    />
                    {#if mode === 'edit'}
                      <button
                        type="button"
                        on:click={() => handleRemoveImage(index)}
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      >
                        <span class="material-symbols-outlined text-sm">close</span>
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
              {formState.images.length > 0 ? 'Add More Images' : 'Product Images'}
            </label>
            <input
              type="file"
              id="images"
              accept="image/*"
              multiple
              on:change={handleFileChange}
              class="mt-1 block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Variations Section -->
    <div class="space-y-3">
      <div class="flex justify-between items-center">
        <h3 class="text-base font-bold text-orange-500">Variations</h3>
        <button
          type="button"
          on:click={addVariation}
          class="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-sm">add</span>
          Add Variation
        </button>
      </div>

      {#each Object.entries(formState.variations) as [category, values]}
        <div class="bg-gray-50 p-3 rounded-lg space-y-2">
          <div class="flex items-center gap-2">
            <input
              type="text"
              value={category}
              on:input={(e) => {
                const target = e.target as HTMLInputElement;
                handleVariationCategoryChange(category, target.value);
              }}
              placeholder="Variation name"
              class="text-base font-semibold rounded-md border-gray-600 bg-gray-100 text-gray-900 focus:border-orange-500 focus:ring-orange-500 flex-1"
            />
            <button
              type="button"
              on:click={() => handleRemoveVariation(category)}
              class="text-red-500 hover:text-red-600 p-1"
            >
              <span class="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>

          <div class="space-y-2">
            {#each values as value, index}
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  value={value}
                  on:input={(e) => {
                    const target = e.target as HTMLInputElement;
                    handleVariationValueChange(category, index, target.value);
                  }}
                  placeholder="Value"
                  class="text-sm rounded-md border-gray-600 bg-gray-100 text-gray-900 focus:border-orange-500 focus:ring-orange-500"
                />
                <button
                  type="button"
                  on:click={() => handleVariationRemove(category, index)}
                  class="text-red-500 hover:text-red-600 p-1"
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
        <h3 class="text-base font-bold text-orange-500">Specifications</h3>
        <button
          type="button"
          on:click={addSpec}
          class="text-sm text-orange-600 hover:text-orange-700 flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-sm">add</span>
          Add Specification
        </button>
      </div>

      {#each formState.specs as spec, index}
        <div class="flex items-center gap-2">
          <input
            type="text"
            bind:value={spec}
            on:input={(e) => {
              const target = e.target as HTMLInputElement;
              handleSpecChange(index, target.value);
            }}
            placeholder="Specification"
            class="text-sm rounded-md border-gray-600 bg-gray-100 text-gray-900 focus:border-orange-500 focus:ring-orange-500"
          />
          <button
            type="button"
            on:click={() => removeSpec(index)}
            class="text-red-500 hover:text-red-600"
          >
            <span class="material-symbols-outlined text-sm">remove</span>
          </button>
        </div>
      {/each}
    </div>

    <!-- Detailed Information Section -->
    <div class="space-y-2">
      <h3 class="text-base font-bold text-orange-500">Detailed Information</h3>
      <textarea
        bind:value={formState.detailedInfo}
        rows="5"
        placeholder="Enter detailed product information..."
        class="block w-full rounded-md border-gray-600 bg-gray-100 text-gray-900 shadow-sm focus:border-orange-500 focus:ring-orange-500 text-sm"
      ></textarea>
    </div>

    <!-- Submit Button -->
    <div class="flex justify-end">
      <button
        type="submit"
        disabled={isSubmitting}
        class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors duration-200 text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isSubmitting}
          <span class="material-symbols-outlined text-sm animate-spin">sync</span>
          {mode === 'create' ? 'Creating...' : 'Updating...'}
        {:else}
          <span class="material-symbols-outlined text-sm">save</span>
          {mode === 'create' ? 'Create' : 'Update'} Item
        {/if}
      </button>
    </div>
  </form>
</div> 