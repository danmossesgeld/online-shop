<script lang="ts">
    import { login, signup } from '$lib/auth'; 
    import { writable } from 'svelte/store';
    import { onMount } from 'svelte';
    import { auth } from '$lib/firebase'; 
    import type { User } from 'firebase/auth'; // Import User type from Firebase
    import LoadingSpinner from '$lib/components/LoadingSpinner.svelte'; // Import the spinner
  
    let email = '';
    let password = '';
    const error = writable('');
    let isSignUp = false; // Track whether we're in sign-up or login mode
    let loading = true; // Loading state to handle async auth check
    let user: User | null = null; // Explicitly define the type for user
  
    // Check if the user is logged in when the component mounts
    onMount(() => {
      const unsubscribe = auth.onAuthStateChanged((currentUser) => {
        user = currentUser;
        loading = false;
      });
      return unsubscribe;
    });
  
    const handleSubmit = async () => {
      try {
        const action = isSignUp ? signup : login;
        await action(email, password);
        window.location.href = '/mainpage';
      } catch (err) {
        error.set(err instanceof Error ? err.message : 'An unknown error occurred');
      }
    };
  
    const toggleForm = () => {
      isSignUp = !isSignUp;
      error.set(''); // Clear error when toggling between forms
    };
  </script>
  
  {#if loading}
    <!-- Display the loading spinner while auth state is being checked -->
    <div class="min-h-screen flex items-center justify-center">
      <LoadingSpinner message="Checking authentication..." fullScreen={false} color="orange" />
    </div>
  {:else if user}
    <!-- If user is already logged in, redirect to dashboard -->
    <script>
      window.location.href = '/mainpage';
    </script>
  {:else}
    <!-- Show the login/signup form if the user is not logged in -->
    <div class="max-w-sm mx-auto mt-10">
      <h2 class="text-2xl font-semibold text-center mb-4">{isSignUp ? 'Sign Up' : 'Login'}</h2>
    
      <form on:submit|preventDefault={handleSubmit}>
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium">Email</label>
          <input
            type="email"
            id="email"
            bind:value={email}
            class="w-full px-4 py-2 mt-2 border rounded-md"
            required
          />
        </div>
        
        <div class="mb-4">
          <label for="password" class="block text-sm font-medium">Password</label>
          <input
            type="password"
            id="password"
            bind:value={password}
            class="w-full px-4 py-2 mt-2 border rounded-md"
            required
          />
        </div>

        <p class="text-red-500">{$error}</p>

        <button
          type="submit"
          class="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
        >
          {isSignUp ? 'Sign Up' : 'Login'}
        </button>
      </form>

      <div class="mt-4 text-center">
        <p>
          {isSignUp ? "Already have an account?" : "Don't have an account?"} 
          <button
            type="button"
            class="text-blue-500"
            on:click={toggleForm}
          >
            {isSignUp ? 'Login here' : 'Sign up here'}
          </button>
        </p>
      </div>
    </div>
  {/if}
  