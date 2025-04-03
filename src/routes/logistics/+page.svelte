<script lang="ts">
    import ShippingCalculator from '$lib/components/ShippingCalculator.svelte';
    import ShipmentTracker from '$lib/components/ShipmentTracker.svelte';
    import type { PhilippineAddress } from '$lib/types/logistics';

    let activeTab: 'calculator' | 'tracking' = 'calculator';
    let trackingNumber = '';

    // Example addresses (in a real app, these would come from user input or store settings)
    const originAddress: PhilippineAddress = {
        street: '123 Store Street',
        barangay: 'Sample Barangay',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
        region: 'NCR',
        country: 'Philippines'
    };

    const destinationAddress: PhilippineAddress = {
        street: '456 Customer Street',
        barangay: 'Customer Barangay',
        city: 'Quezon City',
        province: 'Metro Manila',
        postalCode: '1100',
        region: 'NCR',
        country: 'Philippines'
    };

    const weight = 1; // 1kg example weight
</script>

<div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold text-gray-900 mb-8">Logistics Services</h1>

    <!-- Tab Navigation -->
    <div class="border-b border-gray-200 mb-8">
        <nav class="-mb-px flex space-x-8">
            <button
                class="py-4 px-1 border-b-2 font-medium text-sm
                {activeTab === 'calculator'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                on:click={() => activeTab = 'calculator'}
            >
                Shipping Calculator
            </button>
            <button
                class="py-4 px-1 border-b-2 font-medium text-sm
                {activeTab === 'tracking'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
                on:click={() => activeTab = 'tracking'}
            >
                Track Shipment
            </button>
        </nav>
    </div>

    <!-- Tab Content -->
    {#if activeTab === 'calculator'}
        <ShippingCalculator
            origin={originAddress}
            destination={destinationAddress}
            weight={weight}
        />
    {:else}
        <div class="max-w-md mx-auto">
            <div class="mb-6">
                <label for="tracking-number" class="block text-sm font-medium text-gray-700 mb-2">
                    Enter Tracking Number
                </label>
                <input
                    type="text"
                    id="tracking-number"
                    bind:value={trackingNumber}
                    class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your tracking number"
                />
            </div>
            <ShipmentTracker trackingNumber={trackingNumber} />
        </div>
    {/if}
</div> 