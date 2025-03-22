import { writable } from 'svelte/store';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

function createNotificationStore() {
  const { subscribe, update } = writable<Notification[]>([]);

  return {
    subscribe,
    add: (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const id = crypto.randomUUID();
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