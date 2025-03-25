<script lang="ts">
    import { onMount } from 'svelte';
    import { page } from '$app/stores';

    onMount(() => {
        const searchParams = new URLSearchParams($page.url.search);
        if (searchParams.get('closeWindow') === 'true') {
            // Send cancel message to parent window
            if (window.opener) {
                window.opener.postMessage({ type: 'payment_cancelled' }, '*');
            }
            // Close this window
            window.close();
        }
    });
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="bg-white p-8 rounded-xl shadow-lg text-center max-w-md w-full mx-4">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span class="material-symbols-outlined text-3xl text-red-600">close</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900 mb-4">Payment Cancelled</h1>
        <p class="text-gray-600">This window will close automatically.</p>
    </div>
</div> 