<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { createAdminUser } from '$lib/auth';
  import { getFirestore, collection, getDocs } from 'firebase/firestore';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  let email = '';
  let password = '';
  let confirmPassword = '';
  let error = '';
  let success = '';
  let loading = true;
  let setupAllowed = false;

  const db = getFirestore();

  onMount(async () => {
    // Check if any users exist
    const usersSnapshot = await getDocs(collection(db, 'users'));
    setupAllowed = usersSnapshot.empty;
    loading = false;
  });

  const handleSubmit = async () => {
    error = '';
    success = '';

    if (!setupAllowed) {
      error = 'Admin setup is not allowed. Users already exist.';
      return;
    }

    if (!email || !password || !confirmPassword) {
      error = 'Please fill in all fields.';
      return;
    }

    if (password !== confirmPassword) {
      error = 'Passwords do not match.';
      return;
    }

    if (password.length < 6) {
      error = 'Password must be at least 6 characters long.';
      return;
    }

    try {
      loading = true;
      await createAdminUser(email, password);
      success = 'Admin user created successfully!';
      setTimeout(() => {
        goto('/login');
      }, 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An error occurred during setup.';
    } finally {
      loading = false;
    }
  };
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8">
    {#if loading}
      <div class="flex justify-center">
        <LoadingSpinner message="Checking setup status..." />
      </div>
    {:else if !setupAllowed}
      <div class="text-center">
        <span class="material-symbols-outlined text-5xl text-red-500 mb-4">admin_panel_settings</span>
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Setup Not Allowed</h2>
        <p class="text-gray-600 mb-4">Admin setup has already been completed.</p>
        <a
          href="/login"
          class="inline-flex items-center px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors duration-200"
        >
          <span class="material-symbols-outlined mr-2">login</span>
          Go to Login
        </a>
      </div>
    {:else}
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Setup
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          Create your admin account
        </p>
      </div>

      {#if error}
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span class="block sm:inline">{error}</span>
        </div>
      {/if}

      {#if success}
        <div class="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded relative" role="alert">
          <span class="block sm:inline">{success}</span>
        </div>
      {/if}

      <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              bind:value={email}
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="Email address"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              bind:value={password}
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="Password"
            />
          </div>
          <div>
            <label for="confirm-password" class="sr-only">Confirm Password</label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              required
              bind:value={confirmPassword}
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
              placeholder="Confirm Password"
            />
          </div>
        </div>

        <div>
          <button
            type="submit"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Create Admin Account
          </button>
        </div>
      </form>
    {/if}
  </div>
</div> 