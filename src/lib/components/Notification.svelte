<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  interface Notification {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }

  let notificationCounter = 0;
  function generateId() {
    notificationCounter += 1;
    return `notification-${Date.now()}-${notificationCounter}`;
  }

  function createNotificationStore() {
    const { subscribe, update } = writable<Notification[]>([]);

    return {
      subscribe,
      add: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        const id = generateId();
        update(notifications => [...notifications, { id, message, type }]);
        
        // Remove notification after 3 seconds
        setTimeout(() => {
          update(notifications => notifications.filter(n => n.id !== id));
        }, 3000);
      },
      remove: (id: string) => {
        update(notifications => notifications.filter(n => n.id !== id));
      }
    };
  }

  export const notifications = createNotificationStore();
</script>

<script lang="ts">
  import { fade } from 'svelte/transition';
  import Icon from '@iconify/svelte';
</script>

<div class="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2">
  {#each $notifications as notification (notification.id)}
    <div
      transition:fade={{ duration: 200 }}
      class="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg px-5 py-3 flex items-center gap-3 min-w-[200px] border border-gray-200 dark:border-gray-700"
    >
      {#if notification.type === 'success'}
        <Icon icon="material-symbols:check-circle" class="text-green-500 text-xl" />
      {:else if notification.type === 'error'}
        <Icon icon="material-symbols:error" class="text-red-500 text-xl" />
      {:else}
        <Icon icon="material-symbols:info" class="text-blue-500 text-xl" />
      {/if}
      <span class="text-gray-700 dark:text-gray-200">{notification.message}</span>
    </div>
  {/each}
</div> 