<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { doc, collection, setDoc } from 'firebase/firestore';
  import { onAuthStateChanged } from 'firebase/auth';
  import { auth, db } from '$lib/firebase';
  import { notifications } from '$lib/components/Notification.svelte';
  import ItemForm from '$lib/components/ItemForm.svelte';

  // Authentication check
  let user: any = null;
  let authLoading = true;
  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        notifications.add('Please login to continue', 'error');
        goto('/login');
      } else {
        user = currentUser;
      }
      authLoading = false;
    });
    return unsubscribe;
  });

  const handleSubmit = async (event: CustomEvent<{ itemData: any }>) => {
    const { itemData } = event.detail;
    const itemId = doc(collection(db, 'items')).id;
    
    try {
      await setDoc(doc(db, 'items', itemId), {
        ...itemData,
        itemId
      });

      notifications.add('Item created successfully', 'success');
      setTimeout(() => goto('/userdashboard/items'), 1500);
    } catch (error) {
      console.error('Error creating item:', error);
      notifications.add('Failed to create item', 'error');
    }
  };
</script>

<div class="max-w-full">
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold text-gray-700">Create New Item</h2>
      <button
        on:click={() => goto('/userdashboard/items')}
        class="text-gray-500 hover:text-gray-700 transition-colors duration-200"
      >
        <span class="material-symbols-outlined text-2xl">close</span>
      </button>
    </div>

    <ItemForm mode="create" on:submit={handleSubmit} />
  </div>
</div>
