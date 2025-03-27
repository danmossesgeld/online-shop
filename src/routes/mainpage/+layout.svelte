<script lang="ts">
    import { onMount } from 'svelte';
    import { notifications } from '$lib/components/Notification.svelte';
    import { auth } from '$lib/firebase';
    import { goto } from '$app/navigation';
    import { authStore as globalAuthStore } from '$lib/store/auth';
    import { isAuthenticated } from '$lib/auth';
    import { 
        itemsStore, 
        errorStore, 
        fetchItems, 
        fetchCategories,
        startItemsListener, 
        stopItemsListener,
        startCategoriesListener,
        stopCategoriesListener 
    } from '$lib/store/items';

    let mounted = false;
    let unsubscribeAuth: () => void;
    let authChecked = false;

    // Subscribe to global auth store to immediately update our local state
    $: {
        const isAuth = $globalAuthStore.isAuthenticated;
        if (!authChecked && !$globalAuthStore.isLoading) {
            authChecked = true;
            
            if (!isAuth) {
                goto('/login');
            } else if (mounted) {
                // Only load items and categories if we're authenticated and mounted
                fetchItems();
                fetchCategories();
                startItemsListener();
                startCategoriesListener();
            }
        }
    }

    onMount(() => {
        mounted = true;
        
        // If auth state is already established, use it immediately
        if (!$globalAuthStore.isLoading) {
            authChecked = true;
            
            if (!$globalAuthStore.isAuthenticated) {
                goto('/login');
            } else {
                fetchItems();
                fetchCategories();
                startItemsListener();
                startCategoriesListener();
            }
        } else {
            // Fallback to traditional auth checking if needed
            unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
                if (!user) {
                    goto('/login');
                    return;
                }

                await Promise.all([fetchItems(), fetchCategories()]);
                startItemsListener();
                startCategoriesListener();
            });
        }

        return () => {
            mounted = false;
            if (unsubscribeAuth) {
                unsubscribeAuth();
            }
            stopItemsListener();
            stopCategoriesListener();
        };
    });
</script>

<slot /> 