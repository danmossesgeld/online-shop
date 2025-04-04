<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { getUserType } from '$lib/auth';
  import { notifications } from '$lib/components/Notification.svelte';

  let loading = true;
  let userType: string | null = null;

  onMount(async () => {
    const user = auth.currentUser;
    if (!user) {
      goto('/login');
      return;
    }
    
    try {
      userType = await getUserType(user.uid);
    } catch (err) {
      console.error('Error loading dashboard:', err);
      notifications.add('Error loading dashboard', 'error');
    } finally {
      loading = false;
    }
  });
</script>

<div class="min-h-full">
  {#if loading}
    <div class="h-[calc(100vh-10rem)] flex items-center justify-center">
      <div class="text-center">
        <span class="loading loading-spinner loading-lg text-primary"></span>
        <p class="mt-2 text-base-content/60">Loading dashboard...</p>
      </div>
    </div>
  {:else}
    <div class="h-[calc(100vh-10rem)] flex flex-col items-center justify-center">
      <div class="text-center">
        <span class="material-symbols-outlined text-5xl text-primary mb-4">dashboard</span>
        <h2 class="text-2xl font-semibold text-base-content mb-2">Welcome to {userType === 'admin' ? 'Admin' : 'User'} Dashboard</h2>
        <p class="text-base-content/60">Select a section from the sidebar to get started</p>
      </div>
    </div>
  {/if}
</div>

<style>
  :global(.material-symbols-outlined) {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>
