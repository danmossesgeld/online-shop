<script lang="ts">
  import { onMount } from 'svelte';
  import { auth, db } from '$lib/firebase';
  import { collection, query, where, getDocs, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
  import { goto } from '$app/navigation';
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

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const userType = await getUserType(user.uid);
      isAdmin = userType === 'admin';

      // Query orders
      let ordersQuery;
      if (isAdmin) {
        // Admin sees all orders
        ordersQuery = query(
          collection(db, 'orders'),
          orderBy('timestamp', 'desc')
        );
      } else {
        // Users only see their own orders
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

      // If admin, fetch user details for each order
      if (isAdmin) {
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
  <div class="bg-white rounded-xl shadow-sm">
    <div class="px-6 py-4 border-b border-gray-200">
      <h2 class="text-xl font-semibold text-gray-800">Transaction History</h2>
    </div>

    {#if loading}
      <div class="flex items-center justify-center py-12">
        <span class="material-symbols-outlined text-4xl text-orange-500 animate-spin">sync</span>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
              {#if isAdmin}
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              {/if}
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            {#each orders as order}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.id}</td>
                {#if isAdmin}
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">{order.userDetails?.firstName} {order.userDetails?.lastName}</div>
                    <div class="text-sm text-gray-500">{order.userDetails?.email}</div>
                  </td>
                {/if}
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(order.timestamp)}
                </td>
                <td class="px-6 py-4">
                  <div class="text-sm text-gray-900">
                    {#each order.items as item}
                      <div class="flex items-start gap-2 mb-1">
                        {#if item.thumbnail}
                          <img src={item.thumbnail} alt="" class="w-8 h-8 object-contain rounded" />
                        {/if}
                        <div>
                          <div class="font-medium">{item.name}</div>
                          {#if item.selectedVariations}
                            <div class="text-xs text-gray-500">
                              {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(', ')}
                            </div>
                          {/if}
                          <div class="text-xs text-gray-600">
                            {item.quantity} x {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                    {/each}
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatPrice(order.totalPrice)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${order.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {order.status}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    on:click={() => viewOrder(order.id)}
                    class="text-orange-600 hover:text-orange-900 mr-3"
                  >
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      {#if orders.length === 0}
        <div class="text-center py-12">
          <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">receipt_long</span>
          <p class="text-gray-500">No completed transactions found</p>
        </div>
      {/if}
    {/if}
  </div>
</div> 