<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
  import { getFirestore, doc, setDoc, collection } from 'firebase/firestore';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth } from '$lib/firebase';

  // Authentication check.
  let user: any = null;
  let authLoading = true;
  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        goto('/login');
      } else {
        user = currentUser;
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
  // Variations stored as a record mapping variation category names to arrays of values.
  let variations: Record<string, string[]> = {};
  // Specifications stored as an array of strings.
  let specs: string[] = [];

  const error = writable('');
  const successMessage = writable('');

  // Firebase setup.
  const db = getFirestore();
  const storage = getStorage();

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
    // Validate variations: every variation must have at least one value.
    for (const key in variations) {
      if (variations[key].length === 0) {
        error.set(`Please add values for the "${key}" variation.`);
        return;
      }
    }

    if (
      !itemName ||
      !price ||
      !stock ||
      !category ||
      !thumbnail ||
      images.length === 0 ||
      Object.keys(variations).length === 0
    ) {
      error.set('Please fill in all fields and upload the images.');
      return;
    }

    try {
      const itemId = doc(collection(db, 'items')).id;

      // Upload thumbnail.
      const thumbnailRef = ref(storage, `thumbnails/${itemId}_thumbnail`);
      await uploadBytes(thumbnailRef, thumbnail);
      const thumbnailURL = await getDownloadURL(thumbnailRef);

      // Upload additional images.
      const imageURLs: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const imageRef = ref(storage, `items/${itemId}_image_${i}`);
        await uploadBytes(imageRef, images[i]);
        const imageURL = await getDownloadURL(imageRef);
        imageURLs.push(imageURL);
      }

      // Save item details to Firestore.
      await setDoc(doc(db, 'items', itemId), {
        itemId,
        itemName,
        price,
        stock,
        category,
        thumbnail: thumbnailURL,
        images: imageURLs,
        // Save variations and specs with the same data structure as your product page.
        variations,
        specs,
        createdAt: new Date(),
      });

      successMessage.set('Item listed successfully!');
      // Reset form fields.
      itemName = '';
      price = 0;
      stock = 0;
      category = '';
      thumbnail = null;
      images = [];
      variations = {};
      specs = [];
    } catch (err) {
      error.set('Error uploading item: ' + (err as Error).message);
    }
  };
</script>

{#if authLoading}
  <p class="text-center mt-8">Loading...</p>
{:else}
  <div class="max-w-md mx-auto p-6 bg-white shadow-lg rounded-md">
    <h2 class="text-xl font-semibold mb-4">Sell Your Item</h2>

    {#if $error}
      <p class="text-red-500 mb-4">{$error}</p>
    {/if}

    {#if $successMessage}
      <p class="text-green-500 mb-4">{$successMessage}</p>
    {/if}

    <form on:submit|preventDefault={handleSubmit}>
      <!-- Item Name -->
      <div class="mb-4">
        <label for="itemName" class="block text-sm font-medium">Item Name</label>
        <input
          id="itemName"
          type="text"
          bind:value={itemName}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Price -->
      <div class="mb-4">
        <label for="price" class="block text-sm font-medium">Price</label>
        <input
          id="price"
          type="number"
          bind:value={price}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Stock -->
      <div class="mb-4">
        <label for="stock" class="block text-sm font-medium">Stock</label>
        <input
          id="stock"
          type="number"
          bind:value={stock}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Category -->
      <div class="mb-4">
        <label for="category" class="block text-sm font-medium">Category</label>
        <input
          id="category"
          type="text"
          bind:value={category}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Thumbnail -->
      <div class="mb-4">
        <label for="thumbnail" class="block text-sm font-medium">Thumbnail</label>
        <input
          id="thumbnail"
          type="file"
          accept="image/*"
          on:change={handleFileChange}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Additional Images -->
      <div class="mb-4">
        <label for="images" class="block text-sm font-medium">Additional Images</label>
        <input
          id="images"
          type="file"
          accept="image/*"
          multiple
          on:change={handleFileChange}
          class="w-full px-4 py-2 mt-2 border rounded-md"
          required
        />
      </div>

      <!-- Specifications -->
      <div class="mb-4">
        <label class="block text-sm font-medium">Specifications</label>
        {#each specs as spec, i}
          <div class="mt-2 flex items-center space-x-2">
            <input
              type="text"
              value={spec}
              on:input={(e) => handleSpecChange(i, (e.target as HTMLInputElement).value)}
              class="w-full px-4 py-2 border rounded-md"
              placeholder="Enter a specification"
            />
            <button
              type="button"
              on:click={() => removeSpec(i)}
              class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
            >
              Remove
            </button>
          </div>
        {/each}
        <button
          type="button"
          on:click={addSpec}
          class="mt-2 bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600"
        >
          Add New Specification
        </button>
      </div>

      <!-- Variations -->
      <div class="mb-4">
        <label class="block text-sm font-medium">Variations</label>
        {#each Object.entries(variations) as [key, values]}
          <div class="mt-4 border p-2 rounded">
            <div class="flex items-center space-x-2">
              <input
                type="text"
                value={key}
                on:input={(e) =>
                  handleVariationCategoryChange(key, (e.target as HTMLInputElement).value)
                }
                class="px-4 py-2 border rounded-md flex-1"
                placeholder="Variation name (e.g., Color)"
              />
              <button
                type="button"
                on:click={() => handleAddVariationValue(key)}
                class="bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600"
              >
                Add Value
              </button>
            </div>

            {#each values as value, index}
              <div class="mt-2 flex items-center space-x-2">
                <input
                  type="text"
                  value={value}
                  on:input={(e) =>
                    handleVariationValueChange(key, index, (e.target as HTMLInputElement).value)
                  }
                  class="px-4 py-2 border rounded-md flex-1"
                  placeholder={`Value for ${key}`}
                />
                <button
                  type="button"
                  on:click={() => handleVariationRemove(key, index)}
                  class="bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>
        {/each}

        <button
          type="button"
          on:click={addVariation}
          class="mt-2 bg-blue-500 text-white py-2 px-6 rounded-md hover:bg-blue-600"
        >
          Add New Variation
        </button>
      </div>

      <button
        type="submit"
        class="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
      >
        List Item
      </button>
    </form>
  </div>
{/if}
