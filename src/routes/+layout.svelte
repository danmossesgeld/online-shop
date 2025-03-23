<script lang="ts">
  import '../app.css'; // Import your CSS to ensure styles are applied globally
  import Notification from '$lib/components/Notification.svelte';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';

  onMount(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        goto('/mainpage');
      } else {
        goto('/login');
      }
    });
    return unsubscribe;
  });
</script>  

<!-- Material Symbols Icons -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

<Notification />
<slot /> <!-- The rest of the app content will load here -->
