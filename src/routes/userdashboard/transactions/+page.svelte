<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, db } from '$lib/firebase';
  import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
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
    status: 'delivered' | 'cancelled';
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

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
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
      // Filter orders in memory for completed ones (delivered or cancelled)
      const ordersData = querySnapshot.docs
        .map(doc => ({
          ...(doc.data() as Omit<Order, 'id' | 'timestamp'>),
          id: doc.id,
          timestamp: doc.data().timestamp?.toDate() || new Date()
        }))
        .filter(order => ['delivered', 'cancelled'].includes(order.status));

      // If admin view, fetch user details for each order
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
      console.error('Error loading transactions:', error);
      notifications.add('Error loading transactions', 'error');
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(price);
  };

  const viewOrder = (orderId: string) => {
    goto(`/userdashboard/orderList/${orderId}`);
  };
</script>

<div class="p-6">
  <div class="card bg-base-100 shadow-sm">
    <div class="px-6 py-4 border-b border-base-300">
      <h2 class="text-xl font-semibold text-base-content">Transaction History</h2>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <span class="loading loading-spinner loading-lg text-primary"></span>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Order ID</th>
              {#if viewType === 'admin' && isAdmin}
                <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Customer</th>
              {/if}
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Items</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Total</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-base-content/50 uppercase tracking-wider bg-base-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each orders as order}
              <tr class="hover:bg-base-200/50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-base-content">{order.id}</td>
                {#if viewType === 'admin' && isAdmin}
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-base-content">{order.userDetails?.firstName} {order.userDetails?.lastName}</div>
                    <div class="text-sm text-base-content/60">{order.userDetails?.email}</div>
                  </td>
                {/if}
                <td class="px-6 py-4 whitespace-nowrap text-sm text-base-content">
                  {formatDate(order.timestamp)}
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-base-content">
                    {#each order.items as item}
                      <div class="flex items-start gap-2 mb-1">
                        {#if item.thumbnail}
                          <img src={item.thumbnail} alt="" class="w-8 h-8 object-contain rounded" />
                        {/if}
                        <div>
                          <div class="font-medium text-base-content">{item.name}</div>
                          {#if item.selectedVariations}
                            <div class="text-xs text-base-content/60">
                              {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </div>
                          {/if}
                          <div class="text-xs text-base-content/60">
                            {item.quantity} x {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-base-content">
                  {formatPrice(order.totalPrice)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                    {order.status === 'delivered' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}"
                  >
                    {order.status}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <button
                    on:click={() => viewOrder(order.id)}
                    class="btn btn-ghost btn-sm"
                    title="View Order"
                  >
                    <iconify-icon icon="material-symbols:visibility" width="20" height="20" class="text-base-content/70 hover:text-base-content"></iconify-icon>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if orders.length === 0}
        <div class="text-center py-12">
          <iconify-icon icon="material-symbols:receipt-long" width="48" height="48" class="text-base-content/40"></iconify-icon>
          <p class="text-base-content/60">No completed transactions found</p>
        </div>
      {/if}
    {/if}
  </div>
</div> 