<script lang="ts">
  import '../app.css'; // Import your CSS to ensure styles are applied globally
  import Notification from '$lib/components/Notification.svelte';
  import AuthChecker from '$lib/components/AuthChecker.svelte';
</script>  

<!-- Material Symbols Icons -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

<AuthChecker
  loginPath="/login"
  publicRoutes={['/login', '/signup', '/reset-password']}
  spinnerColor="orange"
>
  <Notification />
  <slot /> <!-- The rest of the app content will load here -->
</AuthChecker>
