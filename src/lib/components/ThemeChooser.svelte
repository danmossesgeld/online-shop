<script lang="ts">
    import { fade } from 'svelte/transition';
    import { notifications } from './Notification.svelte';
    import { getFirestore, doc, updateDoc } from 'firebase/firestore';
    import { auth } from '$lib/firebase';
    import { onMount, onDestroy } from 'svelte';

    // Props
    // svelte-ignore export_let_unused
        export let showDropdown = false;
    export let onClose = () => {};

    // Theme data
    const themeCategories = [
        {
            name: "Light Themes",
            themes: [
                { name: 'light', label: 'Light', colors: { primary: '#FF6B00', secondary: '#ffffff' } },
                { name: 'cupcake', label: 'Cupcake', colors: { primary: '#93c5fd', secondary: '#ffffff' } },
                { name: 'bumblebee', label: 'Bumblebee', colors: { primary: '#eab308', secondary: '#ffffff' } },
                { name: 'emerald', label: 'Emerald', colors: { primary: '#10b981', secondary: '#ffffff' } },
                { name: 'corporate', label: 'Corporate', colors: { primary: '#2563eb', secondary: '#ffffff' } },
                { name: 'garden', label: 'Garden', colors: { primary: '#ec4899', secondary: '#ffffff' } },
                { name: 'pastel', label: 'Pastel', colors: { primary: '#d1c1d7', secondary: '#ffffff' } },
                { name: 'fantasy', label: 'Fantasy', colors: { primary: '#6e0b75', secondary: '#ffffff' } },
                { name: 'cmyk', label: 'CMYK', colors: { primary: '#0891b2', secondary: '#ffffff' } },
                { name: 'autumn', label: 'Autumn', colors: { primary: '#8c0327', secondary: '#ffffff' } },
                { name: 'lemonade', label: 'Lemonade', colors: { primary: '#519903', secondary: '#ffffff' } },
                { name: 'lofi', label: 'Lofi', colors: { primary: '#0d0d0d', secondary: '#ffffff' } },
                { name: 'winter', label: 'Winter', colors: { primary: '#047aff', secondary: '#ffffff' } },
                { name: 'cyberpunk', label: 'Cyberpunk', colors: { primary: '#eab308', secondary: '#eab308' } },
                { name: 'retro', label: 'Retro', colors: { primary: '#ef9995', secondary: '#ffffff' } },
                { name: 'valentine', label: 'Valentine', colors: { primary: '#e96d7b', secondary: '#ffffff' } }
            ]
        },
        {
            name: "Dark Themes",
            themes: [
                { name: 'dark', label: 'Dark', colors: { primary: '#3b82f6', secondary: '#1f2937' } },
                { name: 'synthwave', label: 'Synthwave', colors: { primary: '#e779c1', secondary: '#4c1d95' } },
                { name: 'halloween', label: 'Halloween', colors: { primary: '#fbbf24', secondary: '#374151' } },
                { name: 'forest', label: 'Forest', colors: { primary: '#10b981', secondary: '#1f1f1f' } },
                { name: 'aqua', label: 'Aqua', colors: { primary: '#0ea5e9', secondary: '#1e40af' } },
                { name: 'black', label: 'Black', colors: { primary: '#343232', secondary: '#2e2d2d' } },
                { name: 'luxury', label: 'Luxury', colors: { primary: '#fbbf24', secondary: '#000000' } },
                { name: 'dracula', label: 'Dracula', colors: { primary: '#ff79c6', secondary: '#bd93f9' } },
                { name: 'night', label: 'Night', colors: { primary: '#38bdf8', secondary: '#818cf8' } },
                { name: 'coffee', label: 'Coffee', colors: { primary: '#fbbf24', secondary: '#3e2723' } },
                { name: 'business', label: 'Business', colors: { primary: '#1c4f82', secondary: '#7c909a' } }
            ]
        }
    ];

    const db = getFirestore();
    let dropdownElement: HTMLDivElement;
    let backdropElement: HTMLDivElement;

    // Theme handlers
    const handleThemeChange = async (theme: string) => {
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save theme to localStorage as fallback
        localStorage.setItem('theme', theme);
        
        // If user is logged in, save theme to their profile
        const user = auth.currentUser;
        if (user) {
            try {
                const userRef = doc(db, 'users', user.uid);
                await updateDoc(userRef, {
                    theme: theme
                });
            } catch (err) {
                console.error('Error saving theme to user profile:', err);
                notifications.add('Error saving theme preference', 'error');
            }
        }
        
        onClose();
    };

    // Click outside handler
    const handleClickOutside = (event: MouseEvent) => {
        if (showDropdown && 
            dropdownElement && 
            !dropdownElement.contains(event.target as Node) &&
            backdropElement &&
            !backdropElement.contains(event.target as Node)) {
            onClose();
        }
    };

    // Handle escape key
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && showDropdown) {
            onClose();
        }
    };

    // Add and remove event listeners
    onMount(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
    });

    onDestroy(() => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleKeyDown);
    });
</script>

{#if showDropdown}
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <!-- svelte-ignore element_invalid_self_closing_tag -->
    <div 
        bind:this={backdropElement}
        class="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
        transition:fade={{ duration: 150 }}
        on:click={onClose}
    />

    <!-- Dropdown -->
    <div 
        bind:this={dropdownElement}
        class="fixed right-4 top-16 w-80 bg-base-200 rounded-lg shadow-lg border border-base-300 z-50 max-h-[80vh] overflow-y-auto"
        transition:fade={{ duration: 150 }}
    >
        <div class="sticky top-0 bg-base-200 p-3 border-b border-base-300 flex items-center justify-between">
            <h3 class="font-semibold text-base-content">Select Theme</h3>
            <button 
                class="btn btn-ghost btn-circle btn-sm"
                on:click={onClose}
            >
                <span class="material-symbols-outlined text-base-content/60">close</span>
            </button>
        </div>
        <div class="p-2">
            {#each themeCategories as category}
                <div class="mb-4">
                    <div class="px-2 py-1 text-sm font-medium text-base-content/60">{category.name}</div>
                    <div class="grid grid-cols-1 gap-1">
                        {#each category.themes as theme}
                            <button
                                class="flex items-center gap-3 px-3 py-2 hover:bg-base-200 rounded-lg transition-colors"
                                class:bg-base-200={document.documentElement.getAttribute('data-theme') === theme.name}
                                on:click={() => handleThemeChange(theme.name)}
                            >
                                <div class="flex-1 flex items-center gap-3">
                                    <div class="flex gap-1">
                                        <div class="w-4 h-4 rounded-full" style="background-color: {theme.colors.primary}"></div>
                                        <div class="w-4 h-4 rounded-full" style="background-color: {theme.colors.secondary}"></div>
                                    </div>
                                    <span class="text-sm font-medium text-base-content">{theme.label}</span>
                                </div>
                                {#if document.documentElement.getAttribute('data-theme') === theme.name}
                                    <span class="material-symbols-outlined text-primary text-sm">check_circle</span>
                                {/if}
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </div>
{/if}

<style>
    /* Optimize transitions */
    .fixed {
        will-change: transform, opacity;
        transform: translateZ(0);
        backface-visibility: hidden;
    }

    /* Smooth scrollbar */
    .overflow-y-auto {
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--bc) / 0.2) transparent;
    }

    .overflow-y-auto::-webkit-scrollbar {
        width: 6px;
    }

    .overflow-y-auto::-webkit-scrollbar-track {
        background: transparent;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb {
        background-color: hsl(var(--bc) / 0.2);
        border-radius: 3px;
    }

    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
        background-color: hsl(var(--bc) / 0.3);
    }
</style> 