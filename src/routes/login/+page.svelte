<script lang="ts">
  import { login, signup } from '$lib/auth';
  import { writable } from 'svelte/store';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  
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
</script>

{#if isLoading}
  <LoadingSpinner message={isSignUp ? "Creating your account..." : "Signing you in..."} fullScreen={true} color="orange" />
{:else}
  <div class="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
    <div class="sm:mx-auto sm:w-full sm:max-w-md">
      <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
        {isSignUp ? 'Create your account' : 'Sign in to your account'}
      </h2>
    </div>

    <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
      <div class="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
        <form class="space-y-6" on:submit|preventDefault={handleSubmit}>
          {#if isSignUp}
            <div>
              <label for="firstName" class="block text-sm font-medium text-gray-700">First Name</label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-gray-400">person</span>
                </div>
                <input
                  type="text"
                  id="firstName"
                  bind:value={firstName}
                  class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  <span class="material-symbols-outlined text-gray-400">person</span>
                </div>
                <input
                  type="text"
                  id="lastName"
                  bind:value={lastName}
                  class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  class:border-red-500={formErrors.lastName}
                  required
                />
              </div>
              {#if formErrors.lastName}
                <p class="mt-1 text-sm text-red-600">{formErrors.lastName}</p>
              {/if}
            </div>

            <div>
              <label for="midName" class="block text-sm font-medium text-gray-700">Middle Name (Optional)</label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-gray-400">person</span>
                </div>
                <input
                  type="text"
                  id="midName"
                  bind:value={midName}
                  class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label for="address" class="block text-sm font-medium text-gray-700">Address</label>
              <div class="mt-1 relative rounded-md shadow-sm">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span class="material-symbols-outlined text-gray-400">home</span>
                </div>
                <input
                  type="text"
                  id="address"
                  bind:value={address}
                  class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                  <span class="material-symbols-outlined text-gray-400">phone</span>
                </div>
                <input
                  type="tel"
                  id="contactNumber"
                  bind:value={contactNumber}
                  class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
            <label for="email" class="block text-sm font-medium text-gray-700">Email address</label>
            <div class="mt-1 relative rounded-md shadow-sm">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="material-symbols-outlined text-gray-400">email</span>
              </div>
              <input
                type="email"
                id="email"
                bind:value={email}
                class="block w-full pl-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
                <span class="material-symbols-outlined text-gray-400">lock</span>
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
                <span class="material-symbols-outlined text-gray-400 hover:text-gray-500">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
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
                  <span class="material-symbols-outlined text-red-400">error</span>
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
              class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>

        <div class="mt-6">
          <div class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-gray-300"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white text-gray-500">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </span>
            </div>
          </div>

          <div class="mt-6">
            <button
              type="button"
              class="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              on:click={() => isSignUp = !isSignUp}
            >
              {isSignUp ? 'Sign in instead' : 'Create an account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
