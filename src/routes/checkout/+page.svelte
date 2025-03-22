<script lang="ts">
    import { cart, cartTotal, checkout } from '$lib/store/cart';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/components/Notification.svelte';
    import { auth } from '$lib/firebase';
    import { onMount } from 'svelte';
    import type { User } from 'firebase/auth';

    let user: User | null = null;
    let loading = true;
    let processing = false;

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            loading = false;
        });

        return () => unsubscribe();
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
            const orderId = await checkout();
            if (orderId) {
                goto('/userdashboard/orderList');
            }
        } catch (error) {
            console.error('Checkout error:', error);
            notifications.add('Failed to process checkout', 'error');
        } finally {
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

<div class="min-h-screen bg-gray-50 pt-20 pb-10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="max-w-3xl mx-auto">
            <h1 class="text-2xl font-bold text-gray-900 mb-8">Checkout</h1>

            {#if loading}
                <div class="text-center py-10">
                    <span class="material-symbols-outlined text-4xl animate-spin text-orange-500">sync</span>
                </div>
            {:else if !user}
                <div class="text-center py-10">
                    <p class="text-gray-600 mb-4">Please log in to complete your purchase</p>
                    <a 
                        href="/login" 
                        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600"
                    >
                        Log In
                    </a>
                </div>
            {:else if $cart.length === 0}
                <div class="text-center py-10">
                    <span class="material-symbols-outlined text-4xl text-gray-400 mb-2">shopping_cart</span>
                    <p class="text-gray-600">Your cart is empty</p>
                    <a 
                        href="/mainpage" 
                        class="inline-flex items-center px-4 py-2 mt-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600"
                    >
                        Continue Shopping
                    </a>
                </div>
            {:else}
                <div class="bg-white shadow-lg rounded-xl overflow-hidden">
                    <div class="p-8">
                        <h2 class="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>
                        
                        <div class="space-y-6">
                            {#each $cart as item (item.id + (item.selectedVariations ? JSON.stringify(item.selectedVariations) : ''))}
                                <div class="flex items-start gap-6 p-4 rounded-lg bg-gray-50">
                                    <div class="w-24 h-24 bg-white rounded-lg flex-shrink-0 flex items-center justify-center shadow-sm">
                                        {#if item.thumbnail}
                                            <img src={item.thumbnail} alt="" class="w-20 h-20 object-contain" />
                                        {:else}
                                            <span class="material-symbols-outlined text-gray-400 text-3xl">image</span>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-base font-medium text-gray-900">{item.name}</div>
                                        {#if item.selectedVariations}
                                            <div class="text-sm text-gray-600 mt-1">
                                                {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                            </div>
                                        {/if}
                                        <div class="flex items-center justify-between mt-2">
                                            <div class="text-sm text-gray-600">Quantity: {item.quantity}</div>
                                            <div class="text-base font-medium text-orange-600">
                                                {formatPrice((item.variationPrice || item.price) * item.quantity)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <div class="mt-8 border-t border-gray-200 pt-6">
                            <div class="flex items-center justify-between">
                                <span class="text-lg font-medium text-gray-900">Total</span>
                                <span class="text-2xl font-bold text-orange-600">{$cartTotal}</span>
                            </div>
                        </div>

                        <div class="mt-8">
                            <button
                                on:click={handleCheckout}
                                disabled={processing}
                                class="w-full flex items-center justify-center px-6 py-4 border border-transparent text-base font-medium rounded-xl text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                                {#if processing}
                                    <span class="material-symbols-outlined animate-spin mr-2">sync</span>
                                    Processing...
                                {:else}
                                    <span class="material-symbols-outlined mr-2">shopping_cart_checkout</span>
                                    Place Order
                                {/if}
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div> 