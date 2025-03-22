<script lang="ts" context="module">
    import type { Writable } from 'svelte/store';
    import { writable } from 'svelte/store';

    interface Item {
        id: string;
        itemName: string;
        price: number;
        thumbnail: string;
        category: string;
    }

    export const itemsStore: Writable<Item[]> = writable([]);
    export const loadingStore: Writable<boolean> = writable(true);
    export const errorStore: Writable<string | null> = writable(null);
</script>

<script lang="ts">
    import { getFirestore, collection, getDocs } from 'firebase/firestore';
    import { onMount } from 'svelte';
    import { notifications } from '$lib/components/Notification.svelte';

    let mounted = false;

    onMount(() => {
        mounted = true;
        const db = getFirestore();

        // Reset stores
        itemsStore.set([]);
        loadingStore.set(true);
        errorStore.set(null);

        // Load items
        (async () => {
            try {
                const itemsSnapshot = await getDocs(collection(db, 'items'));
                const items = itemsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Item[];

                if (mounted) {
                    itemsStore.set(items);
                    loadingStore.set(false);
                }
            } catch (error) {
                console.error('Error loading items:', error);
                if (mounted) {
                    const errorMessage = 'Failed to load items. Please try again later.';
                    errorStore.set(errorMessage);
                    notifications.add(errorMessage, 'error');
                    loadingStore.set(false);
                }
            }
        })();

        return () => {
            mounted = false;
            itemsStore.set([]);
            loadingStore.set(true);
            errorStore.set(null);
        };
    });
</script>

<slot /> 