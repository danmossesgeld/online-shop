<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getStorage, ref, deleteObject } from 'firebase/storage';
  import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
  import { goto } from '$app/navigation';
  import { notifications } from './Notification.svelte';

  // Define strict types
  interface ItemActionsProps {
    itemId: string;
    images: string[];
    thumbnail: string;
  }

  interface ItemActionsEvents {
    delete: { id: string };
    update: { id: string };
  }

  // Props with strict types
  export let itemId: ItemActionsProps['itemId'];
  export let images: ItemActionsProps['images'] = [];
  export let thumbnail: ItemActionsProps['thumbnail'] = '';

  const dispatch = createEventDispatcher<ItemActionsEvents>();
  const db = getFirestore();
  const storage = getStorage();

  // Utility functions
  const handleView = (): void => {
    goto(`/userdashboard/items/view?id=${itemId}`);
  };

  const handleUpdate = (): void => {
    dispatch('update', { id: itemId });
  };

  const handleDelete = async (): Promise<void> => {
    if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete images from storage
      const deletePromises = [
        ...(thumbnail ? [deleteObject(ref(storage, thumbnail))] : []),
        ...images.map(imageUrl => deleteObject(ref(storage, imageUrl)))
      ];

      await Promise.all(deletePromises);
      await deleteDoc(doc(db, 'items', itemId));
      dispatch('delete', { id: itemId });
      notifications.add('Item deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting item:', error);
      notifications.add('Error deleting item. Please try again.', 'error');
    }
  };
</script>

<div 
  class="flex gap-2"
  role="group"
  aria-label="Item actions"
>
  <button
    on:click={handleView}
    class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
    title="View Item"
    aria-label="View item details"
  >
    <span class="material-symbols-outlined" aria-hidden="true">visibility</span>
  </button>
  
  <button
    on:click={handleUpdate}
    class="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
    title="Update Item"
    aria-label="Edit item"
  >
    <span class="material-symbols-outlined" aria-hidden="true">edit</span>
  </button>
  
  <button
    on:click={handleDelete}
    class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    title="Delete Item"
    aria-label="Delete item"
  >
    <span class="material-symbols-outlined" aria-hidden="true">delete</span>
  </button>
</div>

<style>
  /* Ensure buttons are properly sized for touch targets */
  button {
    min-width: 2.5rem;
    min-height: 2.5rem;
  }

  /* Improve focus visibility */
  button:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
</style> 