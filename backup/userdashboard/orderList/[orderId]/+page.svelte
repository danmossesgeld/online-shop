<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, db } from '$lib/firebase';
  import { doc, getDoc, deleteDoc } from 'firebase/firestore';
  import { page } from '$app/stores';
  import { getUserType } from '$lib/auth';
  import { notifications } from '$lib/components/Notification.svelte';

  interface OrderItem {
    id: string;
    name: string;
    quantity: number;
    price: number;
    thumbnail?: string;
    selectedVariations?: Record<string, string>;
  }

  interface Order {
    id: string;
    userId: string;
    items: OrderItem[];
    totalPrice: number;
    status: 'pending' | 'processing' | 'delivered' | 'cancelled';
    timestamp: Date;
    userDetails?: {
      firstName: string;
      lastName: string;
      address: string;
      contactNumber: string;
      email: string;
    };
  }

  let loading = true;
  let order: Order | null = null;
  let isAdmin = false;
  let error = '';

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const userType = await getUserType(user.uid);
      isAdmin = userType === 'admin';

      const orderId = $page.params.orderId;
      const orderDoc = await getDoc(doc(db, 'orders', orderId));

      if (!orderDoc.exists()) {
        error = 'Order not found';
        return;
      }

      const orderData = orderDoc.data();
      
      // Check if user has permission to view this order
      if (!isAdmin && orderData.userId !== user.uid) {
        error = 'You do not have permission to view this order';
        return;
      }

      // Get user details if admin
      let userDetails;
      if (orderData.userId) {
        const userDoc = await getDoc(doc(db, 'users', orderData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          userDetails = {
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            address: userData.address || '',
            contactNumber: userData.contactNumber || '',
            email: userData.email || ''
          };
        }
      }

      order = {
        ...orderData,
        id: orderDoc.id,
        timestamp: orderData.timestamp?.toDate() || new Date(),
        userDetails
      } as Order;

    } catch (err) {
      console.error('Error loading order:', err);
      error = 'Error loading order details';
    } finally {
      loading = false;
    }
  });

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
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(price);
  };

  const cancelOrder = async () => {
    if (!order) return;
    
    try {
      await deleteDoc(doc(db, 'orders', order.id));
      notifications.add('Order cancelled successfully', 'success');
      window.location.href = '/userdashboard/orderList';
    } catch (err) {
      console.error('Error cancelling order:', err);
      notifications.add('Error cancelling order', 'error');
    }
  };
</script>

<div class="p-6">
  <div class="bg-white rounded-xl shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
      <h2 class="text-xl font-semibold text-gray-800">Order Details</h2>
      <div class="flex items-center gap-4">
        {#if order && order.status === 'pending' && !isAdmin}
          <button
            on:click={cancelOrder}
            class="text-red-600 hover:text-red-900 transition-colors duration-150"
            title="Cancel Order"
          >
            <span class="material-symbols-outlined">cancel</span>
          </button>
        {/if}
        <a 
          href="/userdashboard/orderList" 
          class="text-gray-600 hover:text-gray-900"
        >
          <span class="material-symbols-outlined">close</span>
        </a>
      </div>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <span class="material-symbols-outlined text-4xl text-orange-500 animate-spin">sync</span>
      </div>
    {:else if error}
      <div class="p-6 text-center">
        <span class="material-symbols-outlined text-4xl text-red-500 mb-2">error</span>
        <p class="text-red-600">{error}</p>
      </div>
    {:else if order}
      <div class="p-6 space-y-6">
        <!-- Order Header -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-sm font-medium text-gray-500">Order Information</h3>
            <div class="mt-2 space-y-1">
              <p class="text-sm text-gray-900">Order ID: {order.id}</p>
              <p class="text-sm text-gray-900">Date: {formatDate(order.timestamp)}</p>
              <p class="text-sm text-gray-900">Status: 
                <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                  ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                  order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                  'bg-red-100 text-red-800'}`}
                >
                  {order.status}
                </span>
              </p>
            </div>
          </div>

          {#if order.userDetails}
            <div>
              <h3 class="text-sm font-medium text-gray-500">Customer Information</h3>
              <div class="mt-2 space-y-1">
                <p class="text-sm text-gray-900">{order.userDetails.firstName} {order.userDetails.lastName}</p>
                <p class="text-sm text-gray-600">{order.userDetails.email}</p>
                <p class="text-sm text-gray-600">{order.userDetails.contactNumber}</p>
                <p class="text-sm text-gray-600">{order.userDetails.address}</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Order Items -->
        <div>
          <h3 class="text-sm font-medium text-gray-500 mb-4">Order Items</h3>
          <div class="space-y-6">
            {#each order.items as item}
              <div class="flex gap-6 p-4 bg-gray-50 rounded-lg">
                <div class="w-24 h-24 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm">
                  {#if item.thumbnail}
                    <img src={item.thumbnail} alt="" class="w-20 h-20 object-contain" />
                  {:else}
                    <span class="material-symbols-outlined text-gray-400 text-3xl">image</span>
                  {/if}
                </div>
                <div class="flex-1">
                  <div class="flex flex-col">
                    <h4 class="text-lg font-medium text-gray-900">{item.name}</h4>
                    {#if item.selectedVariations}
                      <div class="mt-2">
                        {#each Object.entries(item.selectedVariations) as [key, value]}
                          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-2 mb-2">
                            {key}: {value}
                          </span>
                        {/each}
                      </div>
                    {:else}
                      <p class="text-sm text-gray-500 mt-1">No variations</p>
                    {/if}
                    <div class="mt-2 flex items-center justify-between">
                      <div class="text-sm text-gray-600">
                        Quantity: {item.quantity}
                      </div>
                      <div>
                        <span class="text-sm text-gray-600">Price: {formatPrice(item.price)}</span>
                        <span class="text-sm text-gray-400 mx-2">×</span>
                        <span class="text-base font-medium text-orange-600">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
            
            <div class="mt-6 border-t border-gray-200 pt-6">
              <div class="flex items-center justify-between">
                <span class="text-lg font-medium text-gray-900">Total</span>
                <span class="text-2xl font-bold text-orange-600">{formatPrice(order.totalPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div> 