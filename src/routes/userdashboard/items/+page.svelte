<script lang="ts">
  import { onMount } from 'svelte';
  import { getFirestore, collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
  import { ref, deleteObject } from 'firebase/storage';
  import { goto } from '$app/navigation';
  import { db, storage } from '$lib/firebase';
  import FireTable from '$lib/components/FireTable.svelte';
  import { notifications } from '$lib/components/Notification.svelte';

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
      component: (item: Item) => `
        <div class="flex items-center">
          <img src="${item.thumbnail}" alt="${item.itemName}" class="h-10 w-10 rounded-full object-cover mr-3" />
          <div class="text-sm font-medium text-gray-900">${item.itemName}</div>
        </div>
      `
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      formatter: (value: number) => formatPrice(value)
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
      formatter: (value: Date) => formatDate(value)
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

<div class="max-w-full">
  <div class="bg-white rounded-lg shadow-sm p-6">
    <div class="flex justify-between items-center mb-6">
      <h2 class="text-2xl font-semibold text-gray-700">Items List</h2>
      <button
        on:click={() => {
          goto('/userdashboard/items/create');
          notifications.add('Creating new item...', 'info');
        }}
        class="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-all duration-200 flex items-center gap-2 font-medium shadow-sm hover:shadow-md"
      >
        <span class="material-symbols-outlined">add</span>
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
      on:delete={({ detail }: CustomEvent<DeleteEventDetail>) => handleDelete(detail.id, detail.data)}
      on:update={handleUpdate}
    />
  </div>
</div> 