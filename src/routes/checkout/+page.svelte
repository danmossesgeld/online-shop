<script lang="ts">
    import { cart, cartTotal, checkout, setPendingOrderData, clearCart } from '$lib/store/cart';
    import { goto } from '$app/navigation';
    import { notifications } from '$lib/components/Notification.svelte';
    import { onMount } from 'svelte';
    import { authStore } from '$lib/store/auth';
    import '@google-pay/button-element';
    import { fade, fly } from 'svelte/transition';

    let loading = true;
    let processing = false;
    let googlePayButton: any;
    let paymentRequest: any;
    let redirectCountdown = 5;
    let showSuccess = false;
    let redirectTimer: any;

    $: paymentRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
            type: 'CARD',
            parameters: {
                allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                allowedCardNetworks: ['MASTERCARD', 'VISA'],
                billingAddressRequired: true,
                billingAddressParameters: {
                    format: 'FULL',
                    phoneNumberRequired: true
                }
            },
            tokenizationSpecification: {
                type: 'PAYMENT_GATEWAY',
                parameters: {
                    gateway: 'example',
                    gatewayMerchantId: 'BCR2DN4T27NZNDLV'
                }
            }
        }],
        merchantInfo: {
            merchantId: 'BCR2DN4T27NZNDLV',
            merchantName: 'DOKISHOP'
        },
        transactionInfo: {
            displayItems: [
                {
                    label: 'Subtotal',
                    type: 'SUBTOTAL',
                    price: $cartTotal.toString()
                }
            ],
            totalPriceStatus: 'FINAL',
            totalPriceLabel: 'Total',
            totalPrice: $cartTotal.toString(),
            currencyCode: 'PHP',
            countryCode: 'PH'
        }
    };

    function startRedirectCountdown() {
        showSuccess = true;
        redirectTimer = setInterval(() => {
            redirectCountdown--;
            if (redirectCountdown <= 0) {
                clearInterval(redirectTimer);
                goto('/userdashboard/orderList');
            }
        }, 1000);
    }

    function cancelRedirect() {
        clearInterval(redirectTimer);
        showSuccess = false;
        goto('/mainpage');
    }

    onMount(() => {
        // Use the global auth store instead of creating a new listener
        const unsubAuthStore = authStore.subscribe(state => {
            loading = state.isLoading;
        });

        // Initialize Google Pay button with delay to ensure DOM is ready
        const initializeGooglePay = () => {
            googlePayButton = document.querySelector('google-pay-button');
            if (googlePayButton) {
                try {
                    googlePayButton.paymentRequest = paymentRequest;
                    googlePayButton.environment = 'TEST';

                    googlePayButton.addEventListener('loadpaymentdata', async (event: any) => {
                        try {
                            processing = true;
                            console.log('Payment Data:', event.detail);
                            // Store current cart data before processing
                            setPendingOrderData($cart);
                            
                            // Process the order with payment data
                            await checkout(event.detail);
                            
                            // Clear the cart after successful order
                            clearCart();
                            
                            // Show success message and start countdown
                            notifications.add('Order placed successfully!', 'success');
                            startRedirectCountdown();
                            
                        } catch (error) {
                            console.error('Payment error:', error);
                            notifications.add('Failed to process payment. Please try again.', 'error');
                        } finally {
                            processing = false;
                        }
                    });

                    googlePayButton.addEventListener('error', (event: any) => {
                        console.error('Google Pay error:', event.detail);
                        notifications.add('Payment error occurred. Please try again.', 'error');
                    });

                    // Add ready to pay change listener
                    googlePayButton.addEventListener('readytopaychange', (event: any) => {
                        console.log('Ready to pay status:', event.detail);
                    });
                } catch (error) {
                    console.error('Error initializing Google Pay:', error);
                }
            }
        };

        // Initialize with a short delay
        setTimeout(initializeGooglePay, 500);

        return () => {
            unsubAuthStore();
            if (redirectTimer) clearInterval(redirectTimer);
        };
    });

    const handleCheckout = async () => {
        if (!$authStore.isAuthenticated) {
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
            
            // Process the order
            await checkout();
            
            // Clear the cart after successful order
            clearCart();
            
            // Show success message
            notifications.add('Order placed successfully!', 'success');
            
            // Redirect to main page
            goto('/mainpage');

        } catch (error) {
            console.error('Checkout error:', error);
            notifications.add('Failed to process order. Please try again.', 'error');
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

<svelte:head>
    <script src="https://pay.google.com/gp/p/js/pay.js"></script>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md mx-auto">
        {#if loading}
            <div class="flex justify-center items-center min-h-[400px]">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        {:else if showSuccess}
            <div class="bg-white shadow-xl rounded-lg p-8 space-y-6" in:fade>
                <div class="text-center space-y-4">
                    <div class="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                        <svg class="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 class="text-2xl font-semibold text-gray-900">Payment Successful!</h2>
                    <p class="text-gray-600">Redirecting to your orders in {redirectCountdown} seconds...</p>
                    <div class="flex justify-center space-x-4 mt-6">
                        <button
                            on:click={cancelRedirect}
                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Return to Main Page
                        </button>
                        <button
                            on:click={() => goto('/userdashboard/orderList')}
                            class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            View Orders Now
                        </button>
                    </div>
                </div>
            </div>
        {:else}
            <div class="bg-white shadow-xl rounded-lg overflow-hidden">
                <div class="px-6 py-8">
                    <h2 class="text-2xl font-bold text-gray-900 text-center mb-8">Order Summary</h2>
                    <div class="space-y-6">
                        <!-- Cart Items -->
                        <div class="space-y-4">
                            {#each $cart as item}
                                <div class="flex items-start space-x-4 py-3 border-b border-gray-100 last:border-b-0">
                                    {#if item.thumbnail}
                                        <img src={item.thumbnail} alt={item.name} class="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                    {:else}
                                        <div class="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span class="material-symbols-outlined text-gray-400">image</span>
                                        </div>
                                    {/if}
                                    <div class="flex-1 min-w-0">
                                        <h3 class="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                                        <div class="mt-1 flex items-center text-sm text-gray-500">
                                            <span>Qty: {item.quantity}</span>
                                            <span class="mx-2">•</span>
                                            <span>₱{(item.variationPrice || item.price).toFixed(2)}</span>
                                        </div>
                                        {#if item.selectedVariations && Object.keys(item.selectedVariations).length}
                                            <div class="mt-1">
                                                <p class="text-xs text-gray-500">
                                                    {Object.entries(item.selectedVariations).map(([key, value]) => `${key}: ${value}`).join(' / ')}
                                                </p>
                                            </div>
                                        {/if}
                                    </div>
                                    <div class="text-sm font-medium text-gray-900">
                                        ₱{((item.variationPrice || item.price) * item.quantity).toFixed(2)}
                                    </div>
                                </div>
                            {/each}
                        </div>

                        <!-- Price Summary -->
                        <div class="border-t border-gray-200 pt-4 space-y-3">
                            <div class="flex justify-between items-center text-sm text-gray-600">
                                <span>Subtotal</span>
                                <span>₱{$cartTotal.toFixed(2)}</span>
                            </div>
                            <div class="flex justify-between items-center text-sm text-gray-600">
                                <span>Shipping</span>
                                <span>Free</span>
                            </div>
                            <div class="flex justify-between items-center text-base font-semibold text-gray-900 pt-2">
                                <span>Total</span>
                                <span>₱{$cartTotal.toFixed(2)}</span>
                            </div>
                        </div>
                        
                        <!-- Google Pay Button -->
                        <div class="w-full h-12 mt-8">
                            <google-pay-button
                                environment="TEST"
                                button-type="buy"
                                button-color="black"
                                button-size-mode="fill"
                                style="width: 100%; height: 100%;"
                                existing-payment-method-required="false"
                            ></google-pay-button>
                        </div>

                        <!-- Processing Overlay -->
                        {#if processing}
                            <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                                    <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                                    <p class="mt-4 text-gray-600">Processing payment...</p>
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* Add any additional styles here */
</style> 