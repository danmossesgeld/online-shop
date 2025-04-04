<script lang="ts">
    import { writable } from 'svelte/store';
    import { auth } from '$lib/firebase';
    import { signOut, type User } from 'firebase/auth';
    import { cart, cartCount, cartTotal, removeFromCart, updateQuantity, clearCart } from '$lib/store/cart';
    import { onMount, onDestroy } from 'svelte';
    import { goto, invalidateAll } from '$app/navigation';
    import { page } from '$app/stores';
    import { getFirestore, collection, getDocs, doc, updateDoc, getDoc, type DocumentData } from 'firebase/firestore';
    import { searchProducts } from '$lib/store/products';
    import { notifications } from './Notification.svelte';
    import { fade } from 'svelte/transition';
    import { clearStores } from '$lib/store/items';
    import ThemeChooser from './ThemeChooser.svelte';
    import { logout } from '$lib/auth';

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
    let isRefreshing = false;

    // Theme management
    let showThemeDropdown = false;

    // Load user theme
    const loadUserTheme = async (userId: string) => {
        try {
            const userRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.theme) {
                    document.documentElement.setAttribute('data-theme', userData.theme);
                    localStorage.setItem('theme', userData.theme);
                }
            }
        } catch (err) {
            console.error('Error loading user theme:', err);
            // Fallback to localStorage theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
    };

    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged((newUser) => {
        user = newUser;
        if (newUser) {
            loadUserTheme(newUser.uid);
        } else {
            // If logged out, use localStorage theme
            const savedTheme = localStorage.getItem('theme') || 'light';
            document.documentElement.setAttribute('data-theme', savedTheme);
        }
        loading = false;
    });

    // Cleanup on component destroy
    onDestroy(() => {
        unsubscribe();
    });

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
            cartContainer && 
            cartButton && 
            !cartContainer.contains(event.target as Element) && 
            !cartButton.contains(event.target as Element)) {
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
            // Get current category from URL if it exists
            const currentCategory = $page.url.searchParams.get('category');
            // Build URL with both search and category parameters if they exist
            const searchParams = new URLSearchParams();
            searchParams.set('q', trimmedQuery);
            if (currentCategory) {
                searchParams.set('category', currentCategory);
            }
            goto(`/mainpage?${searchParams.toString()}`);
            showSearchDropdown = false;
        }
    };

    const selectSearchResult = async (item: SearchItem): Promise<void> => {
        if (!user) {
            notifications.add('Please log in to view product details', 'error');
            await goto('/login', { replaceState: true });
            return;
        }

        try {
            // First navigate to the product page
            await goto(`/product/${item.id}`, { replaceState: true });
            // Then update the search query
            searchQuery = item.itemName;
            showSearchDropdown = false;
        } catch (err) {
            console.error('Error navigating to product:', err);
            notifications.add('Error loading product details', 'error');
        }
    };

    const handleRemoveFromCart = (itemId: string, selectedVariations?: Record<string, string> | null): void => {
        removeFromCart(itemId, selectedVariations || undefined);
    };

    const handleUpdateQuantity = (itemId: string, quantity: number, selectedVariations?: Record<string, string> | null): void => {
        updateQuantity(itemId, quantity, selectedVariations || undefined);
    };

    const handleClearCart = (): void => {
        clearCart();
    };

    const handleLogout = async (): Promise<void> => {
        try {
            // Use the centralized logout function
            await logout();
            // Redirect to home
            window.location.href = '/';
        } catch (err) {
            console.error('Error logging out:', err);
            notifications.add('Error logging out', 'error');
        }
    };

    const resetHome = async (): Promise<void> => {
        try {
            isRefreshing = true;
            
            // Clear search state
            searchQuery = '';
            searchResults = [];
            showSearchDropdown = false;
            
            // Optimize navigation
            if ($page.url.pathname === '/mainpage') {
                const url = new URL(window.location.href);
                url.search = '';
                history.pushState({}, '', url.toString());
                await invalidateAll();
            } else {
                await goto('/mainpage', { keepFocus: true, noScroll: true });
            }
        } catch (err) {
            console.error('Error resetting home:', err);
            notifications.add('Error resetting home page', 'error');
        } finally {
            isRefreshing = false;
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

        // Always fetch items regardless of auth state
        fetchItems().catch(err => {
            console.error('Error in onMount fetchItems:', err);
        });

        document.addEventListener('click', handleSearchClickOutside);
        document.addEventListener('click', handleCartClickOutside);
        
        return () => {
            document.removeEventListener('click', handleSearchClickOutside);
            document.removeEventListener('click', handleCartClickOutside);
        };
    });

    // Watch for URL changes to update search query and trigger reactivity
    $: {
        const q = $page.url.searchParams.get('q');
        const category = $page.url.searchParams.get('category');
        if (q !== null && q !== searchQuery) {
            searchQuery = q;
            invalidateAll();
        }
        if (category !== null) {
            invalidateAll();
        }
    }

    // Watch for cart changes to trigger reactivity
    $: {
        if ($cart.length > 0) {
            invalidateAll();
        }
    }

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
</script>

{#if loading}
    <div class="text-center py-10">
        <span class="material-symbols-outlined animate-spin text-primary">sync</span>
    </div>
{:else}
    <nav class="navbar fixed w-full bg-base-100/80 backdrop-blur-md text-base-content py-2 px-4 top-0 left-0 z-50 shadow-sm border-b border-base-200">
        <div class="container mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-4 w-full">
            <!-- Left Section - Home Button -->
            <div class="flex-none">
                <button 
                    on:click={resetHome}
                    class="flex-shrink-0 group relative px-3 py-2 rounded-xl hover:bg-primary/10 transition-all duration-300"
                    disabled={isRefreshing}
                >
                    <span class="text-lg font-bold text-primary group-hover:text-primary-focus transition-all duration-300 flex items-center gap-2">
                        {#if isRefreshing}
                            <span class="material-symbols-outlined animate-spin text-primary">sync</span>
                        {:else}
                            <div class="relative flex items-center justify-center">
                                <iconify-icon icon="ri:store-2-line" width="24" height="24"></iconify-icon>
                            </div>
                        {/if}
                        <div class="relative overflow-hidden">
                            <span class="relative inline-flex transition-transform duration-300 ease-out">
                                <span class="text-primary/90">DOKI</span>
                                <span class="text-primary font-extrabold">SHOPPE</span>
                            </span>
                            <div class="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/0 via-primary to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>
                    </span>
                </button>
            </div>

            <!-- Middle Section - Search Bar -->
            {#if user}
                <div class="flex justify-center w-full max-w-3xl mx-auto relative">
                    <form on:submit={handleSearch} class="relative w-full">
                        <input
                            bind:value={searchQuery}
                            bind:this={searchInput}
                            type="text"
                            placeholder="Search products..."
                            class="input input-bordered w-full pl-9 pr-3 py-2 text-sm bg-base-100/80 border-base-200 focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all duration-200"
                        />
                        <button 
                            type="submit"
                            class="absolute left-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-primary transition-colors duration-200"
                        >
                            <span class="material-symbols-outlined text-sm">search</span>
                        </button>
                    </form>

                    <!-- Search Results Dropdown -->
                    {#if showSearchDropdown}
                        <div class="absolute top-full left-0 right-0 mt-1 bg-base-100 rounded-lg shadow-lg border border-base-200 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                            {#each searchResults as item}
                                <button
                                    on:click={() => selectSearchResult(item)}
                                    class="w-full px-4 py-2 text-left hover:bg-base-200 flex items-center gap-3 transition-colors"
                                >
                                    <div class="w-10 h-10 bg-base-200 rounded flex-shrink-0 flex items-center justify-center">
                                        {#if item.thumbnail}
                                            <img 
                                                src={item.thumbnail} 
                                                alt={item.itemName} 
                                                class="w-8 h-8 object-contain"
                                                loading="lazy"
                                                decoding="async"
                                                on:error={(e: Event) => {
                                                    const img = e.currentTarget as HTMLImageElement;
                                                    img.src = 'https://via.placeholder.com/300?text=No+Image';
                                                }}
                                            />
                                        {:else}
                                            <span class="material-symbols-outlined text-base-content/40">image</span>
                                        {/if}
                                    </div>
                                    <div class="flex-1 min-w-0">
                                        <div class="text-sm text-base-content font-medium truncate">{item.itemName}</div>
                                        <div class="text-xs text-primary">{formatPrice(item.price)}</div>
                                    </div>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- Right Section - Icons -->
            <div class="flex items-center justify-end gap-2 flex-none">
                <!-- UserDashboard Button -->
                <a
                    href="/userdashboard"
                    class="btn btn-ghost btn-circle"
                    aria-label="User Dashboard"
                >
                    <span class="material-symbols-outlined text-base-content">person</span>
                </a>

                <!-- Cart Button -->
                <div class="relative">
                    <button
                        bind:this={cartButton}
                        on:click={() => showCart = !showCart}
                        class="btn btn-ghost btn-circle relative"
                        aria-label="Shopping Cart"
                    >
                        <span class="material-symbols-outlined text-base-content">shopping_cart</span>
                        {#if $cartCount > 0}
                            <span class="absolute -top-1 -right-1 bg-primary text-primary-content text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {$cartCount}
                            </span>
                        {/if}
                    </button>

                    <!-- Cart Dropdown -->
                    {#if showCart}
                        <div 
                            bind:this={cartContainer}
                            class="absolute right-0 mt-2 w-80 sm:w-96 bg-base-100 rounded-xl shadow-lg border border-base-200 overflow-hidden max-h-[80vh]"
                        >
                            <div class="flex items-center justify-between p-3 border-b border-base-200">
                                <h3 class="text-base font-semibold text-base-content">Shopping Cart</h3>
                                <button 
                                    on:click={() => showCart = false} 
                                    class="btn btn-ghost btn-circle btn-sm"
                                    aria-label="Close Cart"
                                >
                                    <span class="material-symbols-outlined text-base-content/60 text-xl">close</span>
                                </button>
                            </div>
                            {#if $cart.length > 0}
                                <ul class="space-y-2 max-h-[50vh] overflow-y-auto p-3">
                                    {#each $cart as item (item.id + (item.selectedVariations ? JSON.stringify(item.selectedVariations) : ''))}
                                        <li class="flex items-start gap-3 p-2 bg-base-200 rounded-lg">
                                            <div class="w-16 h-16 bg-base-100 rounded-lg flex-shrink-0 flex items-center justify-center border border-base-300">
                                                {#if item.thumbnail}
                                                    <img 
                                                        src={item.thumbnail} 
                                                        alt={item.name} 
                                                        class="w-12 h-12 object-contain"
                                                        loading="lazy"
                                                        decoding="async"
                                                        on:error={(e: Event) => {
                                                            const img = e.currentTarget as HTMLImageElement;
                                                            img.src = 'https://via.placeholder.com/300?text=No+Image';
                                                        }}
                                                    />
                                                {:else}
                                                    <span class="material-symbols-outlined text-base-content/40">image</span>
                                                {/if}
                                            </div>
                                            <div class="flex-1 min-w-0">
                                                <div class="text-xs font-medium text-base-content truncate">{item.name}</div>
                                                {#if item.selectedVariations}
                                                    <div class="mt-1 flex flex-wrap gap-1">
                                                        {#each Object.entries(item.selectedVariations) as [key, value]}
                                                            <span class="badge badge-primary badge-xs">
                                                                {key}: {value}
                                                            </span>
                                                        {/each}
                                                    </div>
                                                {/if}
                                                <div class="mt-1 text-xs font-semibold text-primary">{formatPrice(item.price)}</div>
                                                <div class="flex items-center gap-1 mt-1">
                                                    <button
                                                        on:click={() => handleUpdateQuantity(item.id, item.quantity - 1, item.selectedVariations)}
                                                        class="btn btn-ghost btn-circle btn-xs"
                                                        aria-label="Decrease Quantity"
                                                    >
                                                        <span class="material-symbols-outlined text-base-content/60 text-xs">remove</span>
                                                    </button>
                                                    <span class="text-xs font-medium text-base-content w-4 text-center">{item.quantity}</span>
                                                    <button
                                                        on:click={() => handleUpdateQuantity(item.id, item.quantity + 1, item.selectedVariations)}
                                                        class="btn btn-ghost btn-circle btn-xs"
                                                        aria-label="Increase Quantity"
                                                    >
                                                        <span class="material-symbols-outlined text-base-content/60 text-xs">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                            <button
                                                on:click={() => handleRemoveFromCart(item.id, item.selectedVariations)}
                                                class="btn btn-ghost btn-circle btn-xs"
                                                aria-label="Remove Item"
                                            >
                                                <span class="material-symbols-outlined text-base-content/60 text-xs">delete</span>
                                            </button>
                                        </li>
                                    {/each}
                                </ul>
                                <div class="border-t border-base-200 p-3 bg-base-100">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="text-xs text-base-content/60">Total:</span>
                                        <span class="text-lg font-bold text-primary">{formatPrice($cartTotal)}</span>
                                    </div>
                                    <div class="flex gap-2">
                                        <button
                                            on:click={handleClearCart}
                                            class="btn btn-ghost btn-sm flex-1"
                                        >
                                            Clear Cart
                                        </button>
                                        <a
                                            href="/checkout"
                                            class="btn btn-primary btn-sm flex-1"
                                        >
                                            Checkout
                                        </a>
                                    </div>
                                </div>
                            {:else}
                                <div class="p-6 text-center">
                                    <span class="material-symbols-outlined text-base-content/40 text-3xl mb-2">shopping_cart</span>
                                    <p class="text-base-content/60 text-sm">Your cart is empty</p>
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <!-- Theme Selector -->
                <div class="relative">
                    <button
                        class="btn btn-ghost btn-circle"
                        on:click={() => showThemeDropdown = !showThemeDropdown}
                        aria-label="Theme selector"
                    >
                        <iconify-icon icon="material-symbols:palette" class="text-xl text-primary"></iconify-icon>
                    </button>
                    {#if showThemeDropdown}
                        <ThemeChooser 
                            showDropdown={showThemeDropdown} 
                            onClose={() => showThemeDropdown = false} 
                        />
                    {/if}
                </div>

                <!-- Logout Button -->
                {#if user}
                <div class="relative">
                    <button
                        class="btn btn-ghost btn-circle"
                        on:click={handleLogout}
                        aria-label="Logout"
                    >
                        <iconify-icon icon="material-symbols:logout" class="text-xl text-error"></iconify-icon>
                    </button>
                </div>
                {/if}
            </div>
        </div>
    </nav>
{/if}

<style>
    li { transition: all 0.2s ease-out; }
    ul::-webkit-scrollbar { width: 4px; }
    ul::-webkit-scrollbar-track { background: transparent; }
    ul::-webkit-scrollbar-thumb { background: hsl(var(--bc) / 0.2); border-radius: 4px; }
    ul::-webkit-scrollbar-thumb:hover { background: hsl(var(--bc) / 0.3); }

    :global(iconify-icon), :global(.material-symbols-outlined) {
        color: hsl(var(--bc));
        transition: all 0.3s ease-out;
    }

    :global(.group:hover iconify-icon), 
    :global(.group:hover .material-symbols-outlined),
    :global(button:hover iconify-icon),
    :global(button:hover .material-symbols-outlined) {
        color: hsl(var(--p));
        transform: scale(1.05);
    }
</style> 