<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { writable } from 'svelte/store';
  import { doc, getDoc } from 'firebase/firestore';
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

  let item: any = null;
  const error = writable('');

  async function loadItem() {
    try {
      const id = $page.url.searchParams.get('id');
      if (!id) {
        error.set('No item ID provided');
        return;
      }
      
      const itemDoc = await getDoc(doc(db, 'items', id));
      
      if (!itemDoc.exists()) {
        error.set('Item not found');
        return;
      }

      item = {
        id: itemDoc.id,
        ...itemDoc.data(),
        createdAt: itemDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: itemDoc.data().updatedAt?.toDate() || new Date()
      };
    } catch (err) {
      error.set('Error loading item: ' + (err as Error).message);
    }
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };
</script>

<div class="max-w-4xl mx-auto p-6">
  <div class="bg-white rounded-lg shadow-md p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold">View Item</h2>
      <div class="flex gap-2">
        <button
          on:click={() => goto(`/userdashboard/items/edit?id=${item?.id}`)}
          class="text-green-600 hover:text-green-800"
          title="Edit Item"
        >
          <span class="material-symbols-outlined">edit</span>
        </button>
        <button
          on:click={() => goto('/userdashboard/items')}
          class="text-gray-600 hover:text-gray-800"
          title="Close"
        >
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
    </div>

    {#if $error}
      <div class="bg-red-50 text-red-500 p-4 rounded-lg mb-6">
        <p class="flex items-center">
          <span class="material-symbols-outlined mr-2">error</span>
          {$error}
        </p>
      </div>
    {/if}

    {#if item}
      <div class="space-y-8">
        <!-- Basic Info -->
        <div class="grid grid-cols-2 gap-6">
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm font-medium text-gray-500">Name</dt>
                <dd class="mt-1 text-sm text-gray-900">{item.itemName}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Category</dt>
                <dd class="mt-1 text-sm text-gray-900">{item.category}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Price</dt>
                <dd class="mt-1 text-sm text-gray-900">{formatPrice(item.price)}</dd>
              </div>
              <div>
                <dt class="text-sm font-medium text-gray-500">Stock</dt>
                <dd class="mt-1 text-sm text-gray-900">{item.stock}</dd>
              </div>
            </dl>
          </div>
          
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Timestamps</h3>
            <dl class="space-y-3">
              <div>
                <dt class="text-sm font-medium text-gray-500">Created At</dt>
                <dd class="mt-1 text-sm text-gray-900">{formatDate(item.createdAt)}</dd>
              </div>
              {#if item.updatedAt}
                <div>
                  <dt class="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd class="mt-1 text-sm text-gray-900">{formatDate(item.updatedAt)}</dd>
                </div>
              {/if}
            </dl>
          </div>
        </div>

        <!-- Images -->
        <div>
          <h3 class="text-lg font-medium text-gray-900 mb-4">Images</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-sm font-medium text-gray-500 mb-2">Thumbnail</h4>
              <img
                src={item.thumbnail}
                alt={item.itemName}
                class="w-full h-48 object-cover rounded-lg"
              />
            </div>
            {#if item.images && item.images.length > 0}
              <div>
                <h4 class="text-sm font-medium text-gray-500 mb-2">Additional Images</h4>
                <div class="grid grid-cols-2 gap-2">
                  {#each item.images as image}
                    <img
                      src={image}
                      alt={item.itemName}
                      class="w-full h-24 object-cover rounded-lg"
                    />
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Specifications -->
        {#if item.specs && item.specs.length > 0}
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
            <ul class="list-disc list-inside space-y-2">
              {#each item.specs as spec}
                <li class="text-sm text-gray-600">{spec}</li>
              {/each}
            </ul>
          </div>
        {/if}

        <!-- Variations -->
        {#if Object.keys(item.variations || {}).length > 0}
          <div>
            <h3 class="text-lg font-medium text-gray-900 mb-4">Variations</h3>
            <dl class="space-y-4">
              {#each Object.entries(item.variations || {}) as [category, values]}
                <div>
                  <dt class="text-sm font-medium text-gray-500">{category}</dt>
                  <dd class="mt-1">
                    <div class="flex flex-wrap gap-2">
                      {#each (values as string[]) as value}
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                          {value}
                        </span>
                      {/each}
                    </div>
                  </dd>
                </div>
              {/each}
            </dl>
          </div>
        {/if}
      </div>
    {:else if !$error}
      <div class="flex justify-center items-center h-64">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    {/if}
  </div>
</div> 