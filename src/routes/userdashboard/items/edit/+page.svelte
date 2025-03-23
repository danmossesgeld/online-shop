<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { doc, getDoc, updateDoc } from 'firebase/firestore';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth, db } from '$lib/firebase';
  import { notifications } from '$lib/components/Notification.svelte';
  import { page } from '$app/stores';
  import ItemForm from '$lib/components/ItemForm.svelte';

  // Authentication check
  let user: any = null;
  let authLoading = true;
  let itemData: any = null;
  let error = '';

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        notifications.add('Please login to continue', 'error');
        goto('/login');
      } else {
        user = currentUser;
        loadItem();
      }
      authLoading = false;
    });
    return unsubscribe;
  });

  async function loadItem() {
    try {
      const id = $page.url.searchParams.get('id');
      if (!id) {
        error = 'No item ID provided';
        notifications.add('No item ID provided', 'error');
        return;
      }
      
      const itemDoc = await getDoc(doc(db, 'items', id));
      
      if (!itemDoc.exists()) {
        error = 'Item not found';
        notifications.add('Item not found', 'error');
        return;
      }

      itemData = {
        id: itemDoc.id,
        ...itemDoc.data()
      };
    } catch (err) {
      error = 'Error loading item: ' + (err as Error).message;
      notifications.add('Error loading item: ' + (err as Error).message, 'error');
    }
  }

  const handleSubmit = async (event: CustomEvent<{ itemData: any }>) => {
    const id = $page.url.searchParams.get('id');
    if (!id) {
      error = 'No item ID provided';
      notifications.add('No item ID provided', 'error');
      return;
    }

    try {
      const { itemData } = event.detail;
      console.log('Received item data:', itemData);
      
      // Ensure all required fields are present
      const requiredFields = ['itemName', 'price', 'stock', 'category', 'thumbnail', 'images', 'variations', 'specs'];
      const missingFields = requiredFields.filter(field => !itemData[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Update item in Firestore
      const itemRef = doc(db, 'items', id);
      console.log('Updating document with data:', itemData);
      
      await updateDoc(itemRef, {
        ...itemData,
        updatedAt: new Date()
      });

      notifications.add('Item updated successfully', 'success');
      setTimeout(() => goto('/userdashboard/items'), 1500);
    } catch (err) {
      console.error('Error updating item:', err);
      notifications.add('Failed to update item: ' + (err as Error).message, 'error');
    }
  };
</script>

<div class="w-full">
  <div class="bg-white rounded-lg shadow-sm p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-gray-700">Edit Item</h2>
      <button
        on:click={() => goto('/userdashboard/items')}
        class="text-gray-500 hover:text-gray-700 transition-colors duration-200"
      >
        <span class="material-symbols-outlined text-xl">close</span>
      </button>
    </div>

    {#if error}
      <div class="bg-red-50 text-red-500 p-3 rounded-lg mb-4 text-sm">
        <p class="flex items-center">
          <span class="material-symbols-outlined mr-2 text-sm">error</span>
          {error}
        </p>
      </div>
    {/if}

    {#if itemData}
      <ItemForm
        mode="edit"
        itemId={itemData.id}
        initialData={itemData}
        on:submit={handleSubmit}
      />
    {:else if !error}
      <div class="flex justify-center items-center h-48">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      </div>
    {/if}
  </div>
</div> 