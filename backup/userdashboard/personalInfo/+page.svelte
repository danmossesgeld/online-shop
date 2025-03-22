<script lang="ts">
  import { onMount } from 'svelte';
  import { auth } from '$lib/firebase';
  import { doc, getDoc, updateDoc } from 'firebase/firestore';
  import { db } from '$lib/firebase';
  import { notifications } from '$lib/components/Notification.svelte';
  import Spinner from '$lib/components/LoadingSpinner.svelte';

  let user: any = null;
  let loading = true;
  let saving = false;
  let userData = {
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    contactNumber: '',
    birthDate: ''
  };

  onMount(async () => {
    try {
      user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        userData = { ...userData, ...userDoc.data() };
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      notifications.add('Error loading user data', 'error');
    } finally {
      loading = false;
    }
  });

  async function handleSubmit() {
    if (!user) return;

    saving = true;
    try {
      await updateDoc(doc(db, 'users', user.uid), userData);
      notifications.add('Profile updated successfully', 'success');
    } catch (error) {
      console.error('Error updating profile:', error);
      notifications.add('Error updating profile', 'error');
    } finally {
      saving = false;
    }
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="bg-white rounded-2xl shadow-sm p-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Personal Information</h1>
      <div class="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
        <span class="material-symbols-outlined text-2xl text-orange-600">person</span>
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center py-8">
        <Spinner message="Loading profile..." fullScreen={false} color="orange" />
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <!-- Name Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="firstName" class="block text-sm font-medium text-gray-700 mb-2">First Name</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
              <input
                type="text"
                id="firstName"
                bind:value={userData.firstName}
                class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your first name"
              />
            </div>
          </div>

          <div>
            <label for="lastName" class="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
            <div class="relative">
              <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
              <input
                type="text"
                id="lastName"
                bind:value={userData.lastName}
                class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter your last name"
              />
            </div>
          </div>
        </div>

        <!-- Email -->
        <div>
          <label for="email" class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">mail</span>
            <input
              type="email"
              id="email"
              bind:value={userData.email}
              class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50"
              placeholder="Enter your email address"
              disabled
            />
          </div>
        </div>

        <!-- Contact Number -->
        <div>
          <label for="contactNumber" class="block text-sm font-medium text-gray-700 mb-2">Contact Number</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">phone</span>
            <input
              type="tel"
              id="contactNumber"
              bind:value={userData.contactNumber}
              class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your contact number"
            />
          </div>
        </div>

        <!-- Birth Date -->
        <div>
          <label for="birthDate" class="block text-sm font-medium text-gray-700 mb-2">Birth Date</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">calendar_today</span>
            <input
              type="date"
              id="birthDate"
              bind:value={userData.birthDate}
              class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        <!-- Address -->
        <div>
          <label for="address" class="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <div class="relative">
            <span class="material-symbols-outlined absolute left-4 top-4 text-gray-400">location_on</span>
            <textarea
              id="address"
              bind:value={userData.address}
              rows="3"
              class="w-full pl-12 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
              placeholder="Enter your complete address"
            ></textarea>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            class="px-6 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 transition-all duration-200 font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {#if saving}
              <Spinner size="sm" />
              Saving...
            {:else}
              <span class="material-symbols-outlined">save</span>
              Save Changes
            {/if}
          </button>
        </div>
      </form>
    {/if}
  </div>
</div>

<style>
  :global(.material-symbols-outlined) {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  }
</style>
