<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { notifications } from '$lib/components/Notification.svelte';
    import { goto } from '$app/navigation';
    import { authStore as globalAuthStore } from '$lib/store/auth';
    import { 
        itemsStore, 
        errorStore, 
        fetchItems, 
        fetchCategories,
        startItemsListener, 
        stopItemsListener,
        startCategoriesListener,
        stopCategoriesListener,
        clearStores
    } from '$lib/store/items';

    let mounted = false;
    
    // Data loading function to avoid duplication
    function loadData() {
        if (mounted && $globalAuthStore.isAuthenticated) {
            fetchItems();
            fetchCategories();
            startItemsListener();
            startCategoriesListener();
        }
    }
    
    // Subscribe to global auth store changes
    $: {
        // Only proceed if we're mounted and the auth state is determined
        if (mounted && !$globalAuthStore.isLoading) {
            // If authenticated, load data
            if ($globalAuthStore.isAuthenticated) {
                loadData();
            } else {
                // If not authenticated, clear stores and stop listeners
                clearStores();
                stopItemsListener();
                stopCategoriesListener();
                // Redirect to login
                window.location.href = '/login';
            }
        }
    }

    onMount(() => {
        mounted = true;
        
        // Initial load if auth is already available
        if (!$globalAuthStore.isLoading && $globalAuthStore.isAuthenticated) {
            loadData();
        }
    });

    onDestroy(() => {
        mounted = false;
        stopItemsListener();
        stopCategoriesListener();
    });
</script>

<slot /> 