<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/store/auth';

  onMount(() => {
    // If user is already authenticated, redirect to mainpage
    if ($authStore.isAuthenticated) {
      goto('/mainpage');
    } else {
      // Otherwise, redirect to login
      goto('/login');
    }
  });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="text-center">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
  </div>
</div> 