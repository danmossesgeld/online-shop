<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { getStorage, ref, deleteObject } from 'firebase/storage';
  import { getFirestore, doc, deleteDoc } from 'firebase/firestore';
  import { goto } from '$app/navigation';

  export let itemId: string;
  export let images: string[] = [];
  export let thumbnail: string = '';

  const dispatch = createEventDispatcher();
  const db = getFirestore();
  const storage = getStorage();

  const handleView = () => {
    goto(`/userdashboard/items/view?id=${itemId}`);
  };

  const handleUpdate = () => {
    dispatch('update', { id: itemId });
  };

  const handleDelete = async () => {
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
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Error deleting item. Please try again.');
    }
  };
</script>

<div class="flex gap-2">
  <button
    on:click={handleView}
    class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors duration-200"
    title="View Item"
  >
    <span class="material-symbols-outlined">visibility</span>
  </button>
  
  <button
    on:click={handleUpdate}
    class="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors duration-200"
    title="Update Item"
  >
    <span class="material-symbols-outlined">edit</span>
  </button>
  
  <button
    on:click={handleDelete}
    class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200"
    title="Delete Item"
  >
    <span class="material-symbols-outlined">delete</span>
  </button>
</div> 