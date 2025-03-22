<script lang="ts">
  import { login, signup } from '$lib/auth';
  import { writable } from 'svelte/store';
  import Icon from '@iconify/svelte';
  
  let email = '';
  let password = '';
  let firstName = '';
  let lastName = '';
  let midName = '';
  let address = '';
  let contactNumber = '';
  const error = writable('');
  let isSignUp = false;
  let isLoading = false;
  let showPassword = false;
  let formErrors: Record<string, string> = {};
  
  const validateForm = () => {
    formErrors = {};
    
    if (!email) {
      formErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      formErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      formErrors.password = 'Password is required';
    } else if (password.length < 6) {
      formErrors.password = 'Password must be at least 6 characters';
    }
    
    if (isSignUp) {
      if (!firstName) formErrors.firstName = 'First name is required';
      if (!lastName) formErrors.lastName = 'Last name is required';
      if (!address) formErrors.address = 'Address is required';
      if (!contactNumber) formErrors.contactNumber = 'Contact number is required';
    }
    
    return Object.keys(formErrors).length === 0;
  };
  
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    try {
      isLoading = true;
      error.set('');
      
      if (isSignUp) {
        await signup(email, password, {
          firstName,
          lastName,
          midName,
          address,
          contactNumber,
          type: 'user'
        });
      } else {
        await login(email, password);
      }
      
      window.location.href = '/mainpage';
    } catch (err) {
      if (err instanceof Error) {
        error.set(err.message);
      } else {
        error.set('An unknown error occurred');
      }
    } finally {
      isLoading = false;
    }
  };
  
  const toggleForm = () => {
    isSignUp = !isSignUp;
    error.set('');
    formErrors = {};
  };
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
  <div class="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
    <div class="text-center">
      <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
        {isSignUp ? 'Create your account' : 'Welcome back'}
      </h2>
      <p class="mt-2 text-sm text-gray-600">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}
        <button
          type="button"
          class="font-medium text-indigo-600 hover:text-indigo-500 transition-colors"
          on:click={toggleForm}
        >
          {isSignUp ? ' Sign in' : ' Sign up'}
        </button>
      </p>
    </div>

    <form class="mt-8 space-y-6" on:submit|preventDefault={handleSubmit}>
      {#if isSignUp}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="material-symbols:person" class="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="firstName"
                bind:value={firstName}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                class:border-red-500={formErrors.firstName}
                required
              />
            </div>
            {#if formErrors.firstName}
              <p class="mt-1 text-sm text-red-600">{formErrors.firstName}</p>
            {/if}
          </div>
          
          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700">Last Name</label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Icon icon="material-symbols:person" class="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="lastName"
                bind:value={lastName}
                class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                class:border-red-500={formErrors.lastName}
                required
              />
            </div>
            {#if formErrors.lastName}
              <p class="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
            {/if}
          </div>
        </div>

        <div>
          <label for="midName" class="block text-sm font-medium text-gray-700">Middle Name</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="material-symbols:person" class="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="midName"
              bind:value={midName}
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label for="address" class="block text-sm font-medium text-gray-700">Address</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="material-symbols:location-on" class="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="address"
              bind:value={address}
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              class:border-red-500={formErrors.address}
              required
            />
          </div>
          {#if formErrors.address}
            <p class="mt-1 text-sm text-red-600">{formErrors.address}</p>
          {/if}
        </div>

        <div>
          <label for="contactNumber" class="block text-sm font-medium text-gray-700">Contact Number</label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon icon="material-symbols:phone" class="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="tel"
              id="contactNumber"
              bind:value={contactNumber}
              class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              class:border-red-500={formErrors.contactNumber}
              required
            />
          </div>
          {#if formErrors.contactNumber}
            <p class="mt-1 text-sm text-red-600">{formErrors.contactNumber}</p>
          {/if}
        </div>
      {/if}

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700">Email</label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon icon="material-symbols:mail" class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="email"
            id="email"
            bind:value={email}
            class="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            class:border-red-500={formErrors.email}
            required
          />
        </div>
        {#if formErrors.email}
          <p class="mt-1 text-sm text-red-600">{formErrors.email}</p>
        {/if}
      </div>
      
      <div>
        <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
        <div class="mt-1 relative rounded-md shadow-sm">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon icon="material-symbols:lock" class="h-5 w-5 text-gray-400" />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            id="password"
            bind:value={password}
            class="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            class:border-red-500={formErrors.password}
            required
          />
          <button
            type="button"
            class="absolute inset-y-0 right-0 pr-3 flex items-center"
            on:click={() => showPassword = !showPassword}
          >
            <Icon
              icon={showPassword ? 'material-symbols:visibility-off' : 'material-symbols:visibility'}
              class="h-5 w-5 text-gray-400 hover:text-gray-500"
            />
          </button>
        </div>
        {#if formErrors.password}
          <p class="mt-1 text-sm text-red-600">{formErrors.password}</p>
        {/if}
      </div>

      {#if $error}
        <div class="rounded-md bg-red-50 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <Icon icon="material-symbols:error" class="h-5 w-5 text-red-400" />
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{$error}</p>
            </div>
          </div>
        </div>
      {/if}

      <div>
        <button
          type="submit"
          class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {#if isLoading}
            <Icon icon="material-symbols:sync" class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
            Processing...
          {:else}
            {isSignUp ? 'Create Account' : 'Sign in'}
          {/if}
        </button>
      </div>
    </form>
  </div>
</div>
