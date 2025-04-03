<script lang="ts" context="module">
  import { writable } from 'svelte/store';

  // Define strict types
  type NotificationType = 'success' | 'error' | 'info';

  interface Notification {
    id: string;
    message: string;
    type: NotificationType;
    duration?: number;
  }

  interface NotificationStore {
    subscribe: (callback: (value: Notification[]) => void) => () => void;
    add: (message: string, type?: NotificationType, duration?: number) => void;
    remove: (id: string) => void;
  }

  // Utility functions
  const generateId = (): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `notification-${timestamp}-${random}`;
  };

  const createNotificationStore = (): NotificationStore => {
    const { subscribe, update } = writable<Notification[]>([]);

    return {
      subscribe,
      add: (message: string, type: NotificationType = 'success', duration = 3000) => {
        // Show notifications related to cart, payment, checkout, item/user updates, and Firestore operations
        const allowedKeywords = [
          'cart', 'payment', 'checkout', 'order', 'purchase', 'transaction',
          'saved', 'updated', 'modified', 'changed', 'edited', 'deleted',
          'profile', 'item', 'product', 'category', 'user', 'details'
        ];
        const isAllowed = allowedKeywords.some(keyword => 
          message.toLowerCase().includes(keyword)
        );

        if (!isAllowed) return;

        const id = generateId();
        const notification: Notification = { id, message, type, duration };
        
        update(notifications => [...notifications, notification]);
        
        // Remove notification after specified duration
        setTimeout(() => {
          update(notifications => notifications.filter(n => n.id !== id));
        }, duration);
      },
      remove: (id: string) => {
        update(notifications => notifications.filter(n => n.id !== id));
      }
    };
  };

  export const notifications = createNotificationStore();
</script>

<script lang="ts">
  import { fade } from 'svelte/transition';

  // Define icon mapping
  const iconMap: Record<Notification['type'], string> = {
    success: 'check_circle',
    error: 'error',
    info: 'info'
  };

  // Define color mapping
  const colorMap: Record<Notification['type'], string> = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };
</script>

<div 
  class="fixed top-4 left-1/2 -translate-x-1/2 z-[1000] flex flex-col gap-2"
  role="region"
  aria-live="polite"
  aria-label="Notifications"
>
  {#each $notifications as notification (notification.id)}
    <div
      transition:fade={{ duration: 200 }}
      class="bg-white/90 dark:bg-gray-800/90 rounded-lg shadow-lg px-5 py-3 flex items-center gap-3 min-w-[200px] border border-gray-200 dark:border-gray-700"
      role="alert"
      aria-label={`${notification.type} notification`}
    >
      <span 
        class="material-symbols-outlined text-xl {colorMap[notification.type]}"
        aria-hidden="true"
      >
        {iconMap[notification.type]}
      </span>
      <span class="text-gray-700 dark:text-gray-200">{notification.message}</span>
    </div>
  {/each}
</div>

<style>
  /* Ensure notifications are above other content */
  div[role="region"] {
    pointer-events: none;
  }

  /* Make notification content interactive */
  div[role="alert"] {
    pointer-events: auto;
  }
</style> 