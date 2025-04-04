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
  <div class="card bg-base-100 shadow-sm">
    <div class="px-4 py-4 border-b border-base-300">
      <h2 class="text-xl font-semibold text-base-content">Active Orders</h2>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else if orders.length === 0}
      <div class="flex flex-col items-center justify-center py-12">
        <span class="material-symbols-outlined text-4xl text-base-content/30 mb-3">receipt_long</span>
        <p class="text-base-content/60">No active orders found</p>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Order ID</th>
              {#if viewType === 'admin' && isAdmin}
                <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Customer</th>
              {/if}
              <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Date</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Items</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Total</th>
              <th class="px-4 py-2 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Status</th>
              <th class="px-4 py-2 text-center text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200 w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each orders as order}
              <tr class="hover:bg-base-200/50 transition-colors duration-150">
                <td class="px-4 py-3 text-sm font-medium text-base-content">{order.id}</td>
                {#if viewType === 'admin' && isAdmin}
                  <td class="px-4 py-3">
                    <div class="text-sm font-medium text-base-content">{order.userDetails?.firstName} {order.userDetails?.lastName}</div>
                    <div class="text-xs text-base-content/60">{order.userDetails?.email}</div>
                  </td>
                {/if}
                <td class="px-4 py-3 text-sm text-base-content">
                  {formatDate(order.timestamp)}
                </td>
                <td class="px-4 py-3">
                  <div class="flex flex-col gap-1">
                    {#each order.items as item}
                      <div class="flex items-center gap-2">
                        {#if item.thumbnail}
                          <img src={item.thumbnail} alt={item.name} class="w-8 h-8 rounded-full object-cover" />
                        {/if}
                        <div class="flex-1 min-w-0">
                          <div class="text-sm font-medium text-base-content truncate">{item.name}</div>
                          {#if item.selectedVariations}
                            <div class="text-xs text-base-content/60">
                              {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </div>
                          {/if}
                          <div class="text-xs text-base-content/60">
                            {formatPrice(item.price)} × {item.quantity}
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </td>
                <td class="px-4 py-3 text-sm font-medium text-base-content">
                  {formatPrice(order.totalPrice)}
                </td>
                <td class="px-4 py-3">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    {order.status === 'pending' ? 'bg-warning/10 text-warning' : ''}
                    {order.status === 'processing' ? 'bg-info/10 text-info' : ''}
                    {order.status === 'delivered' ? 'bg-success/10 text-success' : ''}
                    {order.status === 'cancelled' ? 'bg-error/10 text-error' : ''}"
                  >
                    {order.status}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2">
                    <button
                      on:click={() => viewOrder(order.id)}
                      class="btn btn-ghost btn-sm"
                      title="View Order"
                    >
                      <span class="material-symbols-outlined text-base-content/70">visibility</span>
                    </button>
                    {#if isAdmin && order.status === 'pending'}
                      <button
                        on:click={() => updateOrderStatus(order.id, 'processing')}
                        class="btn btn-ghost btn-sm"
                        title="Process Order"
                      >
                        <span class="material-symbols-outlined text-info">local_shipping</span>
                      </button>
                    {/if}
                    {#if !isAdmin && order.status === 'pending'}
                      <button
                        on:click={() => updateOrderStatus(order.id, 'cancelled')}
                        class="btn btn-ghost btn-sm"
                        title="Cancel Order"
                      >
                        <span class="material-symbols-outlined text-error">cancel</span>
                      </button>
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