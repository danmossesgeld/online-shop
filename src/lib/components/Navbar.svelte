<script lang="ts">
    import { writable } from 'svelte/store';
    import { auth } from '$lib/firebase';
    import { signOut, type User } from 'firebase/auth';
    import { cart, cartCount, cartTotal, removeFromCart, updateCartQuantity, clearCart } from '$lib/store/cart';
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { getFirestore, collection, getDocs, type DocumentData } from 'firebase/firestore';
    import { searchProducts } from '$lib/store/products';
    import { notifications } from './Notification.svelte';

    // Define strict types
    interface SearchItem {
        id: string;
        itemName: string;
        thumbnail: string | null;
        price: number;
    }

    interface CartItem {
        id: string;
        name: string;
        price: number;
        quantity: number;
        thumbnail: string | null;
        selectedVariations?: Record<string, string> | null;
    }

    // State management
    let user: User | null = null;
    let loading = true;
    let showCart = false;
    let cartContainer: HTMLElement | null = null;
    let cartButton: HTMLElement | null = null;
    let searchQuery = '';
    let searchResults: SearchItem[] = [];
    let showSearchDropdown = false;
    let searchInput: HTMLInputElement | null = null;
    let allItems: SearchItem[] = [];
    const error = writable('');
    const db = getFirestore();

    // Utility functions
    const formatPrice = (price: number): string => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(price);
    };

    // Event handlers
    const handleCartClickOutside = (event: MouseEvent): void => {
        if (showCart && 
            !cartContainer?.contains(event.target as Node) && 
            !cartButton?.contains(event.target as Node)) {
            showCart = false;
        }
    };

    const handleSearchClickOutside = (event: MouseEvent): void => {
        if (searchInput && !searchInput.contains(event.target as Node)) {
            showSearchDropdown = false;
        }
    };

    const handleSearch = (e: Event): void => {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            goto(`/mainpage?q=${encodeURIComponent(trimmedQuery)}`);
            showSearchDropdown = false;
        }
    };

    const selectSearchResult = (item: SearchItem): void => {
        searchQuery = item.itemName;
        goto(`/mainpage?q=${encodeURIComponent(item.itemName)}`);
        showSearchDropdown = false;
    };

    const handleRemoveFromCart = (itemId: string, selectedVariations?: Record<string, string> | null): void => {
        removeFromCart(itemId, selectedVariations || undefined);
    };

    const handleUpdateQuantity = (itemId: string, quantity: number, selectedVariations?: Record<string, string> | null): void => {
        updateCartQuantity(itemId, quantity, selectedVariations || undefined);
    };

    const handleClearCart = (): void => {
        clearCart();
    };

    const handleLogout = async (): Promise<void> => {
        try {
            await signOut(auth);
            window.location.href = '/';
        } catch (err) {
            console.error('Error logging out:', err);
            notifications.add('Error logging out', 'error');
        }
    };

    // Data fetching
    const fetchItems = async (): Promise<void> => {
        try {
            const itemsSnapshot = await getDocs(collection(db, 'items'));
            allItems = itemsSnapshot.docs.map(doc => ({
                id: doc.id,
                itemName: doc.data().itemName,
                thumbnail: doc.data().thumbnail,
                price: doc.data().price
            }));
        } catch (err) {
            console.error('Error fetching items:', err);
            notifications.add('Error loading products', 'error');
        }
    };

    // Lifecycle hooks
    onMount(() => {
        const q = $page.url.searchParams.get('q');
        if (q !== null) {
            searchQuery = q;
        }

        fetchItems();

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            loading = false;
        });
        
        document.addEventListener('click', handleSearchClickOutside);
        document.addEventListener('click', handleCartClickOutside);
        
        return () => {
            unsubscribe();
            document.removeEventListener('click', handleSearchClickOutside);
            document.removeEventListener('click', handleCartClickOutside);
        };
    });

    // Reactive statements
    $: {
        if (searchQuery.trim().length > 0) {
            searchResults = allItems
                .filter(item => 
                    item.itemName.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .slice(0, 5);
            showSearchDropdown = searchResults.length > 0;
        } else {
            searchResults = [];
            showSearchDropdown = false;
        }
    }

    $: {
        if (showCart) {
            setTimeout(() => document.addEventListener('click', handleCartClickOutside));
        } else {
            document.removeEventListener('click', handleCartClickOutside);
        }
    }
</script>

{#if loading}
    <div class="text-center py-10">
        <span class="material-symbols-outlined animate-spin text-orange-500">sync</span>
    </div>
{:else}
    {#if user}
        <nav class="fixed w-full bg-white/80 backdrop-blur-md text-gray-800 py-2 px-4 top-0 left-0 z-50 shadow-sm border-b border-gray-100">
            <div class="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <a href="/mainpage" class="flex-shrink-0">
                    <span class="text-lg font-bold text-orange-500 hover:text-orange-600 transition-all duration-300">
                        SVELTESHOPEE
                    </span>
                </a>

                <!-- Global Search -->
                <div class="flex-1 max-w-3xl mx-auto relative">
                    <form on:submit={handleSearch} class="relative">
                        <input
                            bind:value={searchQuery}
                            bind:this={searchInput}
                            type="text"
                            placeholder="Search products..."
                            class="w-full pl-9 pr-3 py-2 text-sm rounded-md bg-white/80 border border-gray-200 focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-all duration-200"
                        />
                        <button 
                            type="submit"
                            class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500 transition-colors duration-200"
                        >
                            <span class="material-symbols-outlined text-sm">search</span>
                        </button>
                    </form>

                    <!-- Search Results Dropdown -->
                    {#if showSearchDropdown}
                        <div class="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                            {#each searchResults as item}
                                <button
                                    on:click={() => selectSearchResult(item)}
                                    class="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
                                >
                                    <div class="w-10 h-10 bg-gray-50 rounded flex-shrink-0 flex items-center justify-center">
                                        {#if item.thumbnail}
                                            <img src={item.thumbnail} alt={item.itemName} class="w-8 h-8 object-contain" />
                                        {:else}
                                            <span class="material-symbols-outlined text-gray-400">image</span>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm text-gray-700 font-medium truncate">{item.itemName}</div>
                                        <div class="text-xs text-orange-500">{formatPrice(item.price)}</div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- Right Section -->
                <div class="flex items-center gap-2 flex-shrink-0">
                    <!-- UserDashboard Button -->
                    <a
                        href="/userdashboard"
                        class="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 relative"
                        aria-label="User Dashboard"
                    >
                        <span class="material-symbols-outlined text-gray-600">person</span>
                    </a>

                    <!-- Cart Button -->
                    <div class="relative">
                        <button
                            bind:this={cartButton}
                            on:click={() => showCart = !showCart}
                            class="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 relative"
                            aria-label="Shopping Cart"
                        >
                            <span class="material-symbols-outlined text-gray-600">shopping_cart</span>
                            {#if $cartCount > 0}
                                <span class="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {$cartCount}
                                </span>
                            {/if}
                        </button>

                        <!-- Cart Dropdown -->
                        {#if showCart}
                            <div 
                                bind:this={cartContainer}
                                class="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden"
                            >
                                <div class="flex items-center justify-between p-4 border-b border-gray-100">
                                    <h3 class="text-lg font-semibold text-gray-800">Shopping Cart</h3>
                                    <button 
                                        on:click={() => showCart = false} 
                                        class="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                        aria-label="Close Cart"
                                    >
                                        <span class="material-symbols-outlined text-gray-500 text-xl">close</span>
                                    </button>
                                </div>
                                {#if $cart.length > 0}
                                    <ul class="space-y-3 max-h-[60vh] overflow-y-auto p-4">
                                        {#each $cart as item (item.id + (item.selectedVariations ? JSON.stringify(item.selectedVariations) : ''))}
                                            <li class="flex items-start gap-4 p-3 bg-gray-50 rounded-lg">
                                                <div class="w-20 h-20 bg-white rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-100">
                                                    {#if item.thumbnail}
                                                        <img src={item.thumbnail} alt={item.name} class="w-16 h-16 object-contain" />
                                                    {:else}
                                                        <span class="material-symbols-outlined text-gray-400">image</span>
                                                    {/if}
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <div class="text-sm font-medium text-gray-800">{item.name}</div>
                                                    {#if item.selectedVariations}
                                                        <div class="mt-1 flex flex-wrap gap-1">
                                                            {#each Object.entries(item.selectedVariations) as [key, value]}
                                                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                    {key}: {value}
                                                                </span>
                                                            {/each}
                                                        </div>
                                                    {/if}
                                                    <div class="mt-2 text-sm font-semibold text-orange-600">{formatPrice(item.price)}</div>
                                                    <div class="flex items-center gap-2 mt-2">
                                                        <button
                                                            on:click={() => handleUpdateQuantity(item.id, item.quantity - 1, item.selectedVariations)}
                                                            class="p-1 hover:bg-white rounded-full transition-colors"
                                                            aria-label="Decrease Quantity"
                                                        >
                                                            <span class="material-symbols-outlined text-gray-500 text-sm">remove</span>
                                                        </button>
                                                        <span class="text-sm font-medium text-gray-700 w-6 text-center">{item.quantity}</span>
                                                        <button
                                                            on:click={() => handleUpdateQuantity(item.id, item.quantity + 1, item.selectedVariations)}
                                                            class="p-1 hover:bg-white rounded-full transition-colors"
                                                            aria-label="Increase Quantity"
                                                        >
                                                            <span class="material-symbols-outlined text-gray-500 text-sm">add</span>
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    on:click={() => handleRemoveFromCart(item.id, item.selectedVariations)}
                                                    class="p-1 hover:bg-white rounded-full transition-colors"
                                                    aria-label="Remove Item"
                                                >
                                                    <span class="material-symbols-outlined text-gray-500 text-sm">delete</span>
                                                </button>
                                            </li>
                                        {/each}
                                    </ul>
                                    <div class="border-t border-gray-100 p-4 bg-white">
                                        <div class="flex justify-between items-center mb-4">
                                            <span class="text-sm text-gray-600">Total:</span>
                                            <span class="text-xl font-bold text-orange-600">{formatPrice($cartTotal)}</span>
                                        </div>
                                        <div class="flex gap-3">
                                            <button
                                                on:click={handleClearCart}
                                                class="flex-1 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
                                            >
                                                Clear Cart
                                            </button>
                                            <a
                                                href="/checkout"
                                                class="flex-1 px-4 py-2.5 text-sm text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors text-center font-medium"
                                            >
                                                Checkout
                                            </a>
                                        </div>
                                    </div>
                                {:else}
                                    <div class="p-8 text-center">
                                        <span class="material-symbols-outlined text-gray-400 text-4xl mb-2">shopping_cart</span>
                                        <p class="text-gray-500">Your cart is empty</p>
                                    </div>
                                {/if}
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </nav>
    {:else}
        <nav class="fixed w-full bg-white/80 backdrop-blur-md text-gray-800 py-2 px-4 top-0 left-0 z-50 shadow-sm border-b border-gray-100">
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <a href="/mainpage" class="flex-shrink-0">
                    <span class="text-lg font-bold text-orange-500 hover:text-orange-600 transition-all duration-300">
                        SVELTESHOPEE
                    </span>
                </a>
                <div class="flex items-center gap-4">
                    <a
                        href="/login"
                        class="px-4 py-2 text-sm text-orange-500 hover:text-orange-600 transition-colors"
                    >
                        Login
                    </a>
                </div>
            </div>
        </nav>
    {/if}
{/if}

<style>
    li { transition: all 0.2s ease-out; }
    ul::-webkit-scrollbar { width: 4px; }
    ul::-webkit-scrollbar-track { background: transparent; }
    ul::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 4px; }
    ul::-webkit-scrollbar-thumb:hover { background: #d1d5db; }
</style> 