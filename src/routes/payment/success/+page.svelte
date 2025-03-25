<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { checkout, cart, setPendingOrderData, getPendingOrderData, clearPendingOrderData, clearCart } from '$lib/store/cart';
    import { notifications } from '$lib/components/Notification.svelte';

    let loading = true;
    let orderProcessed = false;
    let redirecting = false;
    let autoRedirectEnabled = true;
    let secondsToRedirect = 5;
    let redirectInterval: ReturnType<typeof setInterval>;

    onMount(() => {
        // Process the order immediately
        const processOrder = async () => {
            try {
                // Get session ID from URL parameters
                const sessionId = $page.url.searchParams.get('session_id');
                
                if (!sessionId) {
                    console.error('No session ID found in URL');
                    loading = false;
                    return;
                }

                // Get the stored cart data
                const storedCartData = getPendingOrderData();
                if (!storedCartData || storedCartData.length === 0) {
                    throw new Error('No items found in stored cart data');
                }

                // Create order first
                const orderId = await checkout();
                
                if (orderId) {
                    // Clear cart data after successful order creation
                    clearCart();
                    
                    // Clear stored cart data after successful order creation
                    clearPendingOrderData();
                    
                    // Show success notification
                    notifications.add('Payment successful! Thank you for your purchase.', 'success');
                    
                    orderProcessed = true;
                    
                    // Start auto-redirect countdown
                    if (autoRedirectEnabled) {
                        redirectInterval = setInterval(() => {
                            secondsToRedirect--;
                            if (secondsToRedirect <= 0) {
                                clearInterval(redirectInterval);
                                redirectToOrders();
                            }
                        }, 1000);
                    }
                } else {
                    throw new Error('Failed to create order');
                }
            } catch (error) {
                console.error('Failed to process order:', error);
                notifications.add('Failed to process order. Please contact support.', 'error');
            } finally {
                loading = false;
            }
        };
        
        // Start processing immediately
        processOrder();
        
        // Clean up on component destruction
        return () => {
            if (redirectInterval) {
                clearInterval(redirectInterval);
            }
        };
    });
    
    const redirectToOrders = () => {
        if (redirecting) return;
        redirecting = true;
        
        // Direct navigation to orders page
        window.location.href = '/userdashboard/orderList';
    };
    
    const cancelAutoRedirect = () => {
        if (redirectInterval) {
            clearInterval(redirectInterval);
            autoRedirectEnabled = false;
        }
    };
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full mx-4">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="material-symbols-outlined text-3xl text-green-600">check_circle</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h1>
        
        {#if loading}
            <p class="text-gray-600 mb-2">Processing your payment...</p>
            <p class="text-gray-500 text-sm mb-4">Please don't close this page.</p>
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mt-4"></div>
        {:else if orderProcessed}
            <p class="text-gray-600 mb-6">Your order has been placed successfully!</p>
            
            {#if autoRedirectEnabled}
                <p class="text-gray-500 text-sm mb-4">
                    Redirecting to your orders in {secondsToRedirect} {secondsToRedirect === 1 ? 'second' : 'seconds'}...
                </p>
                <button 
                    on:click={cancelAutoRedirect}
                    class="text-orange-500 hover:text-orange-600 text-sm font-medium mb-6"
                >
                    Cancel Auto-Redirect
                </button>
            {/if}
            
            <div class="flex flex-col sm:flex-row gap-4 justify-center">
                <button 
                    on:click={redirectToOrders}
                    class="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition-colors"
                >
                    View My Orders
                </button>
                
                <a 
                    href="/mainpage" 
                    class="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                    Continue Shopping
                </a>
            </div>
        {:else}
            <p class="text-gray-600 mb-6">There was an error processing your order. Please contact support.</p>
            <a 
                href="/checkout" 
                class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-orange-500 hover:bg-orange-600 transition-colors"
            >
                Return to Checkout
            </a>
        {/if}
    </div>
</div> 