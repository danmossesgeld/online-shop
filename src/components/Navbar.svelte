<script lang="ts">
    import { writable } from 'svelte/store';
    import { auth } from '$lib/firebase';
    import { signOut, type User } from 'firebase/auth';
    import { cart } from '$lib/store/cart';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    let user: User | null = null;
    let loading = true;
    let showCart = false;
    let cartContainer: HTMLElement;
    let cartButton: HTMLElement;

    const error = writable('');

    onMount(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            loading = false;
        });
        return () => unsubscribe();
    });

    const handleLogout = async () => {
        try {
            await signOut(auth);
            window.location.href = '/';
        } catch (err) {
            error.set('Error logging out: ' + (err as Error).message);
        }
    };

    const handleRemoveFromCart = (itemId: string) => {
        cart.update(items => items.filter(item => item.id !== itemId));
    };

    const handleClearCart = () => {
        cart.set([]);
    };

    const updateQuantity = (itemId: string, action: 'increase' | 'decrease') => {
        cart.update(items => items.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    quantity: Math.max(1, action === 'increase' ? item.quantity + 1 : item.quantity - 1)
                };
            }
            return item;
        }));
    };

    const redirectToMainPage = () => goto('/mainpage');

    function handleClickOutside(event: MouseEvent) {
        if (showCart && !cartContainer?.contains(event.target as Node) && !cartButton?.contains(event.target as Node)) {
            showCart = false;
        }
    }

    $: {
        if (showCart) {
            setTimeout(() => document.addEventListener('click', handleClickOutside));
        } else {
            document.removeEventListener('click', handleClickOutside);
        }
    }
</script>

{#if loading}
    <div class="text-center py-10"></div>
{:else}
    {#if user}
        <nav class="fixed w-full bg-white/80 backdrop-blur-md text-gray-800 py-3 px-4 top-0 left-0 z-50 shadow-sm border-b border-gray-100">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <button type="button" on:click={redirectToMainPage} class="text-xl font-bold cursor-pointer text-orange-500 hover:text-orange-600 transition-all duration-300 ease-in-out">
                    SVELTESHOPEE
                </button>
                <div class="flex items-center space-x-6">
                    <button on:click={() => window.location.href = '/userdashboard'} class="p-2 rounded-full hover:bg-orange-50 transition-all duration-200 ease-in-out group">
                        <span class="material-symbols-outlined text-gray-700 group-hover:text-orange-500 text-2xl">person</span>
                    </button>
                    <div class="relative" bind:this={cartContainer}>
                        <button bind:this={cartButton} on:click={() => showCart = !showCart} class="relative p-2 rounded-full hover:bg-orange-50 transition-all duration-200 ease-in-out group">
                            <span class="material-symbols-outlined text-gray-700 group-hover:text-orange-500 text-2xl">shopping_cart</span>
                            {#if $cart.length > 0}
                                <span class="absolute -top-1 -right-1 bg-orange-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center transform scale-100 transition-transform duration-200">
                                    {$cart.reduce((total, item) => total + item.quantity, 0)}
                                </span>
                            {/if}
                        </button>
                        <div class="absolute right-0 top-full mt-3 w-96 bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-6 transition-all duration-300 ease-out origin-top transform opacity-0 -translate-y-2 scale-y-95 border border-gray-100 {showCart ? 'opacity-100 translate-y-0 scale-y-100' : ''}" class:invisible={!showCart}>
                            <div class="flex items-center justify-between mb-6">
                                <h3 class="text-lg font-semibold text-gray-800">Shopping Cart</h3>
                                <button on:click={() => showCart = false} class="p-1 hover:bg-gray-100 rounded-full transition-colors">
                                    <span class="material-symbols-outlined text-gray-500 text-xl">close</span>
                                </button>
                            </div>
                            {#if $cart.length > 0}
                                <ul class="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                                    {#each $cart as item (item.id)}
                                        <li class="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50/80 transition-colors duration-200 group">
                                            <div class="flex items-center space-x-4">
                                                <div class="w-14 h-14 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                                                    <img src={item.thumbnail} alt={item.name} class="max-w-full max-h-full object-contain p-1" />
                                                </div>
                                                <div>
                                                    <p class="text-sm font-medium text-gray-800 group-hover:text-orange-500 transition-colors">{item.name}</p>
                                                    <p class="text-sm font-semibold text-orange-500">${item.price}</p>
                                                </div>
                                            </div>
                                            <div class="flex items-center space-x-3">
                                                <div class="flex items-center space-x-2 bg-gray-50 rounded-full p-1">
                                                    <button on:click|stopPropagation={() => updateQuantity(item.id, 'decrease')} class="w-6 h-6 rounded-full hover:bg-white transition-colors duration-150 flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-gray-600 text-sm">remove</span>
                                                    </button>
                                                    <span class="text-sm w-5 text-center text-gray-700 font-medium">{item.quantity}</span>
                                                    <button on:click|stopPropagation={() => updateQuantity(item.id, 'increase')} class="w-6 h-6 rounded-full hover:bg-white transition-colors duration-150 flex items-center justify-center">
                                                        <span class="material-symbols-outlined text-gray-600 text-sm">add</span>
                                                    </button>
                                                </div>
                                                <button on:click|stopPropagation={() => handleRemoveFromCart(item.id)} class="p-1 hover:bg-red-50 rounded-full transition-colors">
                                                    <span class="material-symbols-outlined text-red-400 text-xl">delete</span>
                                                </button>
                                            </div>
                                        </li>
                                    {/each}
                                </ul>
                                <div class="pt-6 mt-6 border-t border-gray-100">
                                    <div class="flex justify-between items-center mb-6">
                                        <span class="text-gray-600 font-medium">Total:</span>
                                        <span class="text-xl font-bold text-orange-500">${$cart.reduce((total, item) => total + item.price * item.quantity, 0).toFixed(2)}</span>
                                    </div>
                                    <div class="flex space-x-3">
                                        <button on:click|preventDefault={handleClearCart} class="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined text-sm">delete</span>
                                            Clear All
                                        </button>
                                        <button on:click|preventDefault={() => goto('/checkout')} class="flex-1 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2">
                                            <span class="material-symbols-outlined text-sm">shopping_cart_checkout</span>
                                            Checkout
                                        </button>
                                    </div>
                                </div>
                            {:else}
                                <div class="p-8 text-center">
                                    <span class="material-symbols-outlined text-gray-300 text-5xl mb-3">shopping_cart</span>
                                    <p class="text-gray-400 font-medium">Your cart is empty</p>
                                </div>
                            {/if}
                        </div>
                    </div>
                    <button on:click={handleLogout} class="p-2 rounded-full hover:bg-orange-50 transition-all duration-200 ease-in-out group">
                        <span class="material-symbols-outlined text-gray-700 group-hover:text-orange-500 text-2xl">logout</span>
                    </button>
                </div>
            </div>
        </nav>
    {:else}
        <div class="text-center py-10">Not logged in.</div>
    {/if}
{/if}

<style>
    li { transition: all 0.2s ease-out; }
    ul::-webkit-scrollbar { width: 4px; }
    ul::-webkit-scrollbar-track { background: transparent; }
    ul::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    ul::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style> 