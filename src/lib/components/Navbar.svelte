<script lang="ts">
    import { writable } from 'svelte/store';
    import { auth } from '$lib/firebase';
    import { signOut, type User } from 'firebase/auth';
    import { cart } from '$lib/store/cart';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { getFirestore, collection, getDocs } from 'firebase/firestore';

    interface SearchItem {
        id: string;
        itemName: string;
        thumbnail: string;
        price: number;
    }

    let user: User | null = null;
    let loading = true;
    let showCart = false;
    let cartContainer: HTMLElement;
    let cartButton: HTMLElement;
    let searchQuery = '';
    let searchResults: SearchItem[] = [];
    let showSearchDropdown = false;
    let searchInput: HTMLInputElement;
    let allItems: SearchItem[] = [];

    const error = writable('');
    const db = getFirestore();

    async function fetchItems() {
        try {
            const itemsSnapshot = await getDocs(collection(db, 'items'));
            allItems = itemsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    itemName: data.itemName,
                    thumbnail: data.thumbnail,
                    price: data.price
                };
            });
        } catch (err) {
            console.error('Error fetching items:', err);
        }
    }

    function handleCartClickOutside(event: MouseEvent) {
        if (showCart && !cartContainer?.contains(event.target as Node) && !cartButton?.contains(event.target as Node)) {
            showCart = false;
        }
    }

    onMount(() => {
        const q = $page.url.searchParams.get('q');
        if (q !== null) {
            searchQuery = q;
        }

        // Fetch items for search suggestions
        fetchItems().catch(err => {
            console.error('Error fetching items:', err);
        });

        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            user = currentUser;
            loading = false;
        });

        // Close search dropdown when clicking outside
        const handleSearchClickOutside = (event: MouseEvent) => {
            if (searchInput && !searchInput.contains(event.target as Node)) {
                showSearchDropdown = false;
            }
        };
        
        document.addEventListener('click', handleSearchClickOutside);
        document.addEventListener('click', handleCartClickOutside);
        
        return () => {
            unsubscribe();
            document.removeEventListener('click', handleSearchClickOutside);
            document.removeEventListener('click', handleCartClickOutside);
        };
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

    function handleSearch(e: Event) {
        e.preventDefault();
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            goto(`/mainpage?q=${encodeURIComponent(trimmedQuery)}`);
            showSearchDropdown = false;
        }
    }

    function handleUpdateQuantity(itemId: string, action: 'increase' | 'decrease') {
        cart.update(items => items.map((item: SearchItem) => {
            if (item.id === itemId) {
                return {
                    ...item,
                    quantity: Math.max(1, action === 'increase' ? item.quantity + 1 : item.quantity - 1)
                };
            }
            return item;
        }));
    }

    function selectSearchResult(item: SearchItem) {
        searchQuery = item.itemName;
        goto(`/mainpage?q=${encodeURIComponent(item.itemName)}`);
        showSearchDropdown = false;
    }

    // Auto-suggest functionality
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
    <div class="text-center py-10"></div>
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
                                            <img src={item.thumbnail} alt="" class="w-8 h-8 object-contain" />
                                        {:else}
                                            <span class="material-symbols-outlined text-gray-400">image</span>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm text-gray-700 font-medium truncate">{item.itemName}</div>
                                        <div class="text-xs text-orange-500">₱{item.price?.toFixed(2) || '0.00'}</div>
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
                    >
                        <span class="material-symbols-outlined text-gray-600">person</span>
                    </a>

                    <!-- Cart Button -->
                    <div class="relative">
                        <button
                            bind:this={cartButton}
                            on:click={() => showCart = !showCart}
                            class="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 relative"
                        >
                            <span class="material-symbols-outlined text-gray-600">shopping_cart</span>
                            {#if $cart.length > 0}
                                <span class="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {$cart.reduce((total, item) => total + item.quantity, 0)}
                                </span>
                            {/if}
                        </button>

                        <!-- Cart Dropdown -->
                        {#if showCart}
                            <div 
                                bind:this={cartContainer}
                                class="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden"
                            >
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
                                                        <img src={item.thumbnail} alt={item.itemName} class="max-w-full max-h-full object-contain p-1" />
                                                    </div>
                                                    <div>
                                                        <p class="text-sm font-medium text-gray-800 group-hover:text-orange-500 transition-colors">{item.itemName}</p>
                                                        <p class="text-sm font-semibold text-orange-500">${item.price}</p>
                                                    </div>
                                                </div>
                                                <div class="flex items-center space-x-3">
                                                    <div class="flex items-center space-x-2 bg-gray-50 rounded-full p-1">
                                                        <button on:click|stopPropagation={() => handleUpdateQuantity(item.id, 'decrease')} class="w-6 h-6 rounded-full hover:bg-white transition-colors duration-150 flex items-center justify-center">
                                                            <span class="material-symbols-outlined text-gray-600 text-sm">remove</span>
                                                        </button>
                                                        <span class="text-sm w-5 text-center text-gray-700 font-medium">{item.quantity}</span>
                                                        <button on:click|stopPropagation={() => handleUpdateQuantity(item.id, 'increase')} class="w-6 h-6 rounded-full hover:bg-white transition-colors duration-150 flex items-center justify-center">
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
                        {/if}
                    </div>

                    <!-- Logout Button -->
                    <button
                        on:click={handleLogout}
                        class="p-2 rounded-full hover:bg-gray-100 transition-colors duration-200"
                    >
                        <span class="material-symbols-outlined text-gray-600">logout</span>
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