<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
  import { ref, deleteObject } from 'firebase/storage';
  import { goto } from '$app/navigation';
  import { db, storage } from '$lib/firebase';
  import FireTable from '$lib/components/FireTable.svelte';
  import { notifications } from '$lib/components/Notification.svelte';
  import { itemsStore, fetchItems } from '$lib/store/items';

  interface Item {
    id: string;
    itemName: string;
    price: number;
    stock: number;
    category: string;
    thumbnail: string;
    images: string[];
    createdAt: Date;
    itemId?: string;
    [key: string]: unknown;  // Add index signature for TableItem compatibility
  }

  interface DeleteEventDetail {
    id: string;
    data: Item;
  }

  interface UpdateEventDetail {
    id: string;
  }

  let items: Item[] = [];
  let loading = true;
  let searchQuery = '';
  let sortField = 'createdAt';
  let sortDirection: 'asc' | 'desc' = 'desc';

  const columns = [
    {
      key: 'itemName',
      label: 'Name',
      sortable: true,
      component: (item: Record<string, unknown>) => `
        <div class="flex items-center">
          <img src="${item.thumbnail as string}" alt="${item.itemName as string}" class="h-10 w-10 rounded-full object-cover mr-3" />
          <div class="text-sm font-medium text-base-content">${item.itemName as string}</div>
        </div>
      `
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      formatter: (value: unknown) => formatPrice(value as number)
    },
    {
      key: 'stock',
      label: 'Stock',
      sortable: true
    },
    {
      key: 'createdAt',
      label: 'Created At',
      sortable: true,
      formatter: (value: unknown) => formatDate(value as Date)
    }
  ];

  onMount(() => {
    const q = query(collection(db, 'items'), orderBy(sortField, sortDirection));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      items = snapshot.docs.map(doc => ({
        id: doc.id,
        itemId: doc.data().itemId || doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Item[];
      loading = false;
      // Update the store with the latest items
      itemsStore.set(items);
    });

    return () => unsubscribe();
  });

  const handleDelete = async (id: string, data: Item) => {
    try {
      // Delete the thumbnail from storage
      if (data.thumbnail) {
        const thumbnailRef = ref(storage, data.thumbnail);
        await deleteObject(thumbnailRef);
      }

      // Delete any additional images from storage
      if (data.images && Array.isArray(data.images)) {
        for (const imageUrl of data.images) {
          const imageRef = ref(storage, imageUrl);
          await deleteObject(imageRef);
        }
      }

      // Delete the document from Firestore
      await deleteDoc(doc(db, 'items', id));
      notifications.add('Item deleted successfully', 'success');
      // Refresh items in the store
      await fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      notifications.add('Failed to delete item', 'error');
      throw error;
    }
  };

  const handleUpdate = ({ detail }: CustomEvent<UpdateEventDetail>) => {
    // Make sure we're using the document ID for editing
    const item = items.find(i => i.id === detail.id);
    if (item) {
      goto(`/userdashboard/items/edit?id=${item.id}`);
    } else {
      console.error('Item not found:', detail.id);
      notifications.add('Item not found', 'error');
    }
  };

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

<div class="w-full">
  <div class="card bg-base-100 shadow-sm p-4">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold text-base-content">Items List</h2>
      <button
        on:click={() => {
          goto('/userdashboard/items/create');
          notifications.add('Creating new item...', 'info');
        }}
        class="btn btn-primary gap-1.5 text-sm font-medium"
      >
        <span class="material-symbols-outlined text-base">add</span>
        Add New Item
      </button>
    </div>

    <FireTable
      data={items}
      {columns}
      {loading}
      bind:searchQuery
      bind:sortField
      bind:sortDirection
      on:delete={({ detail }) => handleDelete(detail.id, detail.data as Item)}
      on:update={handleUpdate}
    />
  </div>
</div> 