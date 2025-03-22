<script lang="ts">
  import { login, signup } from '$lib/auth'; // Assuming signup is added in auth.ts
  import { writable } from 'svelte/store';
  
  let email = '';
  let password = '';
  const error = writable('');
  let isSignUp = false; // Track whether we're in sign-up or login mode
  
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
