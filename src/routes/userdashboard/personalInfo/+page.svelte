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
  <div class="card bg-base-100 shadow-sm p-8">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-2xl font-bold text-base-content">Personal Information</h1>
      <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
        <span class="material-symbols-outlined text-2xl text-primary">person</span>
      </div>
    </div>

    {#if loading}
      <div class="flex justify-center py-8">
        <Spinner message="Loading profile..." fullScreen={false} color="orange" />
      </div>
    {:else}
      <form on:submit|preventDefault={handleSubmit} class="space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="form-control">
            <label class="label">
              <span class="label-text text-base-content">First Name</span>
            </label>
            <input
              type="text"
              bind:value={userData.firstName}
              class="input input-bordered bg-base-200"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-base-content">Last Name</span>
            </label>
            <input
              type="text"
              bind:value={userData.lastName}
              class="input input-bordered bg-base-200"
              required
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-base-content">Email</span>
            </label>
            <input
              type="email"
              bind:value={userData.email}
              class="input input-bordered bg-base-200"
              required
              disabled
            />
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-base-content">Contact Number</span>
            </label>
            <input
              type="tel"
              bind:value={userData.contactNumber}
              class="input input-bordered bg-base-200"
              required
            />
          </div>

          <div class="form-control md:col-span-2">
            <label class="label">
              <span class="label-text text-base-content">Address</span>
            </label>
            <textarea
              bind:value={userData.address}
              class="textarea textarea-bordered bg-base-200"
              required
            ></textarea>
          </div>

          <div class="form-control">
            <label class="label">
              <span class="label-text text-base-content">Birth Date</span>
            </label>
            <input
              type="date"
              bind:value={userData.birthDate}
              class="input input-bordered bg-base-200"
              required
            />
          </div>
        </div>

        <div class="flex justify-end">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={saving}
          >
            {#if saving}
              <span class="loading loading-spinner"></span>
              Saving...
            {:else}
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
