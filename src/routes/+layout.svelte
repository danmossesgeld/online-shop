<script lang="ts">
  import '../app.css'; // Import your CSS to ensure styles are applied globally
  import Notification from '$lib/components/Notification.svelte';
</script>  
<!-- Add Font Awesome CDN link -->
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" />

<!-- Add Material Symbols Icons -->
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

<Notification />
<slot></slot> <!-- The rest of the app content will load here -->
