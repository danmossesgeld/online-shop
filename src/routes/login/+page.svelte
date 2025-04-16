<script lang="ts">
  import { login, signup } from '$lib/auth';
  import { writable } from 'svelte/store';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { authStore } from '$lib/store/auth';
  
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
  
  onMount(() => {
    // If user is already authenticated, redirect to mainpage
    if ($authStore.isAuthenticated) {
      goto('/mainpage');
    }
  });
  
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
          email,
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
      
      goto('/mainpage');
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
  <div class="min-h-screen bg-base-200 flex items-center justify-center p-4">
    <div class="card w-full max-w-md bg-base-100 shadow-xl">
      <div class="card-body p-6 sm:p-8">
        <div class="flex flex-col items-center mb-6">
          <div class="avatar placeholder mb-4">
            <div class="bg-primary text-primary-content rounded-full w-16">
              <span class="text-2xl">
                <iconify-icon icon={isSignUp ? "material-symbols:person-add" : "material-symbols:login"} width="32" height="32"></iconify-icon>
              </span>
            </div>
          </div>
          <h2 class="card-title text-3xl font-bold text-center">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p class="text-base-content/60 text-center mt-2">
            {isSignUp ? 'Join our community today' : 'Welcome back! Please enter your details'}
          </p>
        </div>

        <form class="space-y-4" on:submit|preventDefault={handleSubmit}>
          {#if isSignUp}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">First Name</span>
                </label>
                <div class="join">
                  <span class="join-item btn btn-square bg-base-200">
                    <iconify-icon icon="material-symbols:person" width="20" height="20"></iconify-icon>
                  </span>
                  <input
                    type="text"
                    bind:value={firstName}
                    class="join-item input input-bordered w-full focus:input-primary"
                    class:input-error={formErrors.firstName}
                    placeholder="John"
                    required
                  />
                </div>
                {#if formErrors.firstName}
                  <label class="label">
                    <span class="label-text-alt text-error">{formErrors.firstName}</span>
                  </label>
                {/if}
              </div>

              <div class="form-control">
                <label class="label">
                  <span class="label-text font-medium">Last Name</span>
                </label>
                <div class="join">
                  <span class="join-item btn btn-square bg-base-200">
                    <iconify-icon icon="material-symbols:person" width="20" height="20"></iconify-icon>
                  </span>
                  <input
                    type="text"
                    bind:value={lastName}
                    class="join-item input input-bordered w-full focus:input-primary"
                    class:input-error={formErrors.lastName}
                    placeholder="Doe"
                    required
                  />
                </div>
                {#if formErrors.lastName}
                  <label class="label">
                    <span class="label-text-alt text-error">{formErrors.lastName}</span>
                  </label>
                {/if}
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Middle Name (Optional)</span>
              </label>
              <div class="join">
                <span class="join-item btn btn-square bg-base-200">
                  <iconify-icon icon="material-symbols:person" width="20" height="20"></iconify-icon>
                </span>
                <input
                  type="text"
                  bind:value={midName}
                  class="join-item input input-bordered w-full focus:input-primary"
                  placeholder="Middle"
                />
              </div>
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Address</span>
              </label>
              <div class="join">
                <span class="join-item btn btn-square bg-base-200">
                  <iconify-icon icon="material-symbols:home" width="20" height="20"></iconify-icon>
                </span>
                <input
                  type="text"
                  bind:value={address}
                  class="join-item input input-bordered w-full focus:input-primary"
                  class:input-error={formErrors.address}
                  placeholder="123 Main St"
                  required
                />
              </div>
              {#if formErrors.address}
                <label class="label">
                  <span class="label-text-alt text-error">{formErrors.address}</span>
                </label>
              {/if}
            </div>

            <div class="form-control">
              <label class="label">
                <span class="label-text font-medium">Contact Number</span>
              </label>
              <div class="join">
                <span class="join-item btn btn-square bg-base-200">
                  <iconify-icon icon="material-symbols:phone" width="20" height="20"></iconify-icon>
                </span>
                <input
                  type="tel"
                  bind:value={contactNumber}
                  class="join-item input input-bordered w-full focus:input-primary"
                  class:input-error={formErrors.contactNumber}
                  placeholder="+1234567890"
                  required
                />
              </div>
              {#if formErrors.contactNumber}
                <label class="label">
                  <span class="label-text-alt text-error">{formErrors.contactNumber}</span>
                </label>
              {/if}
            </div>
          {/if}

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Email</span>
            </label>
            <div class="join">
              <span class="join-item btn btn-square bg-base-200">
                <iconify-icon icon="material-symbols:email" width="20" height="20"></iconify-icon>
              </span>
              <input
                type="email"
                bind:value={email}
                class="join-item input input-bordered w-full focus:input-primary"
                class:input-error={formErrors.email}
                placeholder="john@example.com"
                required
              />
            </div>
            {#if formErrors.email}
              <label class="label">
                <span class="label-text-alt text-error">{formErrors.email}</span>
              </label>
            {/if}
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text font-medium">Password</span>
            </label>
            <div class="join">
              <span class="join-item btn btn-square bg-base-200">
                <iconify-icon icon="material-symbols:lock" width="20" height="20"></iconify-icon>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                bind:value={password}
                class="join-item input input-bordered w-full focus:input-primary"
                class:input-error={formErrors.password}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                class="join-item btn btn-square bg-base-200 hover:bg-base-300"
                on:click={() => showPassword = !showPassword}
              >
                <iconify-icon icon={showPassword ? "material-symbols:visibility-off" : "material-symbols:visibility"} width="20" height="20"></iconify-icon>
              </button>
            </div>
            {#if formErrors.password}
              <label class="label">
                <span class="label-text-alt text-error">{formErrors.password}</span>
              </label>
            {/if}
          </div>

          {#if $error}
            <div class="alert alert-error shadow-lg">
              <iconify-icon icon="material-symbols:error" width="20" height="20"></iconify-icon>
              <span>{$error}</span>
            </div>
          {/if}

          <div class="form-control mt-6">
            <button
              type="submit"
              class="btn btn-primary w-full gap-2"
              disabled={isLoading}
            >
              <iconify-icon icon={isSignUp ? "material-symbols:person-add" : "material-symbols:login"} width="20" height="20"></iconify-icon>
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>

        <div class="divider text-base-content/60">OR</div>

        <div class="text-center">
          <button
            class="btn btn-ghost w-full gap-2"
            on:click={() => isSignUp = !isSignUp}
          >
            <iconify-icon icon={isSignUp ? "material-symbols:login" : "material-symbols:person-add"} width="20" height="20"></iconify-icon>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<svelte:head>
  <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
</svelte:head>
