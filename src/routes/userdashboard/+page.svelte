<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';

  let selectedComponent: any = null;

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      goto('/login');
      return;
    }
    
    // Check if user is admin
    const userType = await getUserType(user.uid);
    if (userType !== 'admin') {
      goto('/mainpage');
      return;
    }

    // Load items component by default
    const ItemsComponent = (await import('./items/+page.svelte')).default;
    selectedComponent = ItemsComponent;
  });
</script>

<div>
  {#if selectedComponent}
    <svelte:component this={selectedComponent} />
  {:else}
    <div class="text-gray-500 text-xl">
      Loading...
    </div>
  {/if}
</div>

<style>
  :global(.material-symbols-outlined) {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>
