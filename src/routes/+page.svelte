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
      // Add a delay of 1 second to ensure the spinner is shown for at least 1 second
      const timer = setTimeout(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
          user = currentUser; // TypeScript knows this is either User or null
          loading = false; // Update loading state once the auth state is determined
        });
  
        // Cleanup the auth state listener when the component is destroyed
        return () => unsubscribe();
      }, 1000); // 1000ms = 1 second delay
  
      return () => clearTimeout(timer); // Clear the timeout on cleanup
    });
  
    const handleSubmit = async () => {
      try {
        if (isSignUp) {
          await signup(email, password); // Sign up if isSignUp is true
          window.location.href = '/mainpage'; // Redirect after successful sign-up
        } else {
          await login(email, password); // Login if isSignUp is false
          window.location.href = '/mainpage'; // Redirect after successful login
        }
      } catch (err) {
        if (err instanceof Error) {
          error.set(err.message);
        } else {
          error.set('An unknown error occurred');
        }
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
  {:else}
    {#if user}
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
  {/if}
  