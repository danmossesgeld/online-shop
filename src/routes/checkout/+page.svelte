<script lang="ts">
    import { cart, cartTotal, checkout, setPendingOrderData, clearCart } from '$lib/store/cart';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/components/Notification.svelte';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import type { User } from 'firebase/auth';

    let user: User | null = null;
    let loading = true;
    let processing = false;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            loading = false;
        });
        
        // Check if the user was redirected back from a canceled payment
        const canceled = $page.url.searchParams.get('canceled');
        
        if (canceled === 'true') {
            notifications.add('Payment was canceled.', 'info');
        }

        return () => {
            unsubscribe();
        };
    });

    const handleCheckout = async () => {
        if (!user) {
            notifications.add('Please log in to checkout', 'error');
            return;
        }

        if ($cart.length === 0) {
            notifications.add('Your cart is empty', 'error');
            return;
        }

        processing = true;
        
        try {
            // Store current cart data before processing
            setPendingOrderData($cart);
            
            // Create checkout session with PayMongo Checkout API
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    amount: $cartTotal,
                    items: $cart
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create checkout session');
            }
            
            // Redirect to payment page in the same tab
            window.location.href = data.checkoutUrl;

        } catch (error) {
            console.error('Payment error:', error);
            notifications.add('Failed to process payment. Please try again.', 'error');
            processing = false;
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(price);
    };
</script>

<div class="min-h-screen bg-gray-50 pt-16 pb-8">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col md:flex-row md:space-x-8">
            <div class="md:w-2/3">
                <h1 class="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

                {#if loading}
                    <div class="flex justify-center items-center py-20">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
                    </div>
                {:else if !user}
                    <div class="text-center py-8 bg-white rounded-xl shadow-sm">
                        <p class="text-gray-600 mb-4">Please log in to proceed with checkout.</p>
                        <a 
                            href="/login" 
                            class="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-orange-500 hover:bg-orange-600"
                        >
                            Log In
                        </a>
                    </div>
                {:else}
                    <div class="bg-white shadow-sm rounded-xl overflow-hidden">
                        <div class="px-6 py-6">
                            <!-- Cart Summary -->
                            <h2 class="text-lg font-semibold text-gray-900 mb-4">Your Items</h2>
                            
                            {#if $cart.length === 0}
                                <p class="text-gray-500 py-4">Your cart is empty.</p>
                            {:else}
                                <div class="divide-y divide-gray-100 -mx-6">
                                    {#each $cart as item}
                                        <div class="py-3 px-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                                            <div class="flex items-center gap-3">
                                                {#if item.thumbnail}
                                                    <div class="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 overflow-hidden">
                                                        <img src={item.thumbnail} alt={item.name} class="w-full h-full object-cover" />
                                                    </div>
                                                {:else}
                                                    <div class="w-12 h-12 rounded-md bg-gray-100 flex-shrink-0 flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-gray-400">image</span>
                                                    </div>
                                                {/if}
                                                <div>
                                                    <p class="text-gray-900 font-medium text-sm">{item.name}</p>
                                                    <p class="text-gray-500 text-xs">
                                                        Qty: {item.quantity} × {formatPrice(item.variationPrice || item.price)}
                                                    </p>
                                                    {#if item.selectedVariations && Object.keys(item.selectedVariations).length}
                                                        <p class="text-gray-500 text-xs">
                                                            {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                                        </p>
                                                    {/if}
                                                </div>
                                            </div>
                                            <p class="text-gray-900 font-medium text-sm">
                                                {formatPrice((item.variationPrice || item.price) * item.quantity)}
                                            </p>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
            </div>

            {#if !loading && user && $cart.length > 0}
                <div class="md:w-1/3 mt-6 md:mt-0">
                    <div class="bg-white shadow-sm rounded-xl overflow-hidden sticky top-24">
                        <div class="px-6 py-6">
                            <h2 class="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                            
                            <div class="space-y-3 mb-5">
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Subtotal</span>
                                    <span class="text-gray-900">{formatPrice($cartTotal)}</span>
                                </div>
                                <div class="flex justify-between text-sm">
                                    <span class="text-gray-600">Shipping</span>
                                    <span class="text-gray-900">Free</span>
                                </div>
                                <div class="border-t border-gray-100 my-3 pt-3"></div>
                                <div class="flex justify-between text-base font-medium">
                                    <span class="text-gray-900">Total</span>
                                    <span class="text-orange-600 font-semibold">{formatPrice($cartTotal)}</span>
                                </div>
                            </div>
                            
                            <p class="text-xs text-gray-500 mb-5">Payment processed securely via PayMongo.</p>
                            
                            <button
                                on:click={handleCheckout}
                                disabled={processing}
                                class="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {#if processing}
                                    <span class="material-symbols-outlined animate-spin mr-2">sync</span>
                                    Processing...
                                {:else}
                                    <span class="material-symbols-outlined mr-2">shopping_cart_checkout</span>
                                    Proceed to Payment
                                {/if}
                            </button>
                            
                            <div class="flex justify-center mt-4">
                                <a href="/mainpage" class="text-sm text-orange-500 hover:text-orange-600 font-medium">
                                    <span class="material-symbols-outlined text-sm align-text-bottom">arrow_back</span>
                                    Continue Shopping
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div> 