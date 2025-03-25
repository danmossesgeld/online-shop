<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, db } from '$lib/firebase';
  import { collection, query, where, getDocs, orderBy, updateDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
  import { goto } from '$app/navigation';
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
  let orders: Order[] = [];
  let isAdmin = false;
  let viewType = 'user';

  // Reactive statement to re-fetch data when URL changes
  $: {
    if (auth.currentUser) {
      const currentPath = $page.url.pathname;
      const currentView = $page.url.searchParams.get('view') || 'user';
      
      // Only fetch if we're on the orderList path
      if (currentPath.startsWith('/userdashboard/orderList')) {
        fetchOrders();
      }
    }
  }

  async function fetchOrders() {
    loading = true;
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userType = await getUserType(user.uid);
      isAdmin = userType === 'admin';
      
      // Get view type from URL query parameter
      viewType = $page.url.searchParams.get('view') || 'user';

      // Query orders
      let ordersQuery;
      if (viewType === 'admin' && isAdmin) {
        // Admin view - see all orders
        ordersQuery = query(
          collection(db, 'orders'),
          orderBy('timestamp', 'desc')
        );
      } else {
        // User view - see only own orders
        ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
      }

      const querySnapshot = await getDocs(ordersQuery);
      // Filter orders in memory for active ones (pending or processing)
      const ordersData = querySnapshot.docs
        .map(doc => ({
          ...(doc.data() as Omit<Order, 'id' | 'timestamp'>),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }))
        .filter(order => ['pending', 'processing'].includes(order.status));

      // Fetch user details only when in admin view (Order Management)
      if (viewType === 'admin' && isAdmin) {
        for (const order of ordersData) {
          if (order.userId) {
            const userDoc = await getDoc(doc(db, 'users', order.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              order.userDetails = {
                firstName: userData.firstName || '',
                lastName: userData.lastName || '',
                address: userData.address || '',
                contactNumber: userData.contactNumber || '',
                email: userData.email || ''
              };
            }
          }
        }
      }
      
      orders = ordersData as Order[];
    } catch (error) {
      console.error('Error loading orders:', error);
      notifications.add('Error loading orders', 'error');
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (auth.currentUser) {
      fetchOrders();
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

  const viewOrder = (orderId: string) => {
    goto(`/userdashboard/orderList/${orderId}`);
  };

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    try {
      if (newStatus === 'cancelled') {
        // Delete the order document
        await deleteDoc(doc(db, 'orders', orderId));
        // Remove from local state
        orders = orders.filter(order => order.id !== orderId);
        notifications.add('Order cancelled successfully', 'success');
      } else {
        await updateDoc(doc(db, 'orders', orderId), {
          status: newStatus
        });
        
        // Update local state
        orders = orders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        ).filter(order => ['pending', 'processing'].includes(order.status));
        
        notifications.add(`Order ${newStatus} successfully`, 'success');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      notifications.add('Error updating order', 'error');
    }
  };
</script>

<div class="w-full">
  <div class="bg-white rounded-lg shadow-sm">
    <div class="px-4 py-4 border-b border-gray-100">
      <h2 class="text-xl font-semibold text-gray-700">Active Orders</h2>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <span class="material-symbols-outlined text-3xl text-orange-500 animate-spin">sync</span>
      </div>
    {:else if orders.length === 0}
      <div class="flex flex-col items-center justify-center py-12">
        <span class="material-symbols-outlined text-4xl text-gray-400 mb-3">receipt_long</span>
        <p class="text-gray-600">No active orders found</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full divide-y divide-gray-100">
          <thead class="bg-gray-50/50">
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              {#if viewType === 'admin' && isAdmin}
                <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              {/if}
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            {#each orders as order}
              <tr class="hover:bg-gray-50/50 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-gray-900">{order.id}</td>
                {#if viewType === 'admin' && isAdmin}
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-gray-900">{order.userDetails?.firstName} {order.userDetails?.lastName}</div>
                    <div class="text-xs text-gray-500">{order.userDetails?.email}</div>
                  </td>
                {/if}
                <td class="px-4 py-3 text-sm text-gray-900">
                  {formatDate(order.timestamp)}
                </td>
                <td class="px-4 py-3">
                  <div class="text-sm text-gray-900">
                    {#each order.items.slice(0, 1) as item}
                      <div class="flex items-start">
                        <div>
                          <div class="font-medium text-gray-900">
                            {item.name}
                            {#if item.selectedVariations}
                              <span class="text-gray-600 text-xs">
                                ({Object.entries(item.selectedVariations).map(([key, value]) => `${value}`).join(', ')})
                              </span>
                            {/if}
                          </div>
                          <div class="text-xs text-gray-500">
                            {item.quantity} x {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                    {/each}
                    {#if order.items.length > 1}
                      <div class="text-xs text-gray-500 mt-1">
                        +{order.items.length - 1} more {order.items.length - 1 === 1 ? 'item' : 'items'}
                      </div>
                    {/if}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">
                  {formatPrice(order.totalPrice)}
                </td>
                <td class="px-4 py-3">
                  <span class={`px-2 py-1 inline-flex text-xs leading-5 font-medium rounded-full 
                    ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' : 
                    'bg-red-100 text-red-800'}`}>
                    {order.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center space-x-2">
                    {#if isAdmin}
                      <button
                        on:click={() => viewOrder(order.id)}
                        class="text-orange-600 hover:text-orange-900 transition-colors duration-150"
                        title="View Order"
                      >
                        <span class="material-symbols-outlined text-base">visibility</span>
                      </button>

                      {#if order.status === 'pending'}
                        <button
                          on:click={() => updateOrderStatus(order.id, 'processing')}
                          class="text-blue-600 hover:text-blue-900 transition-colors duration-150"
                          title="Mark as Processing"
                        >
                          <span class="material-symbols-outlined text-base">local_shipping</span>
                        </button>
                      {/if}
                      {#if order.status === 'processing'}
                        <button
                          on:click={() => updateOrderStatus(order.id, 'delivered')}
                          class="text-green-600 hover:text-green-900 transition-colors duration-150"
                          title="Mark as Delivered"
                        >
                          <span class="material-symbols-outlined text-base">check_circle</span>
                        </button>
                      {/if}
                      <button
                        on:click={() => updateOrderStatus(order.id, 'cancelled')}
                        class="text-red-600 hover:text-red-900 transition-colors duration-150"
                        title="Cancel Order"
                      >
                        <span class="material-symbols-outlined text-base">cancel</span>
                      </button>
                    {:else}
                      {#if order.status === 'pending'}
                        <button
                          on:click={() => updateOrderStatus(order.id, 'cancelled')}
                          class="text-red-600 hover:text-red-900 transition-colors duration-150"
                          title="Cancel Order"
                        >
                          <span class="material-symbols-outlined text-base">cancel</span>
                        </button>
                      {:else}
                        <button
                          on:click={() => viewOrder(order.id)}
                          class="text-orange-600 hover:text-orange-900 transition-colors duration-150"
                          title="View Order"
                        >
                          <span class="material-symbols-outlined text-base">visibility</span>
                        </button>
                      {/if}
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .overflow-x-auto::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .overflow-x-auto {
    -ms-overflow-style: none;  /* IE and Edge */
    scrollbar-width: none;  /* Firefox */
  }
</style>