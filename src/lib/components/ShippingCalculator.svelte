<script lang="ts">
    import { LogisticsService } from '$lib/services/logisticsService';
    import type { PhilippineAddress, ShippingRate } from '$lib/types/logistics';
    import { onMount } from 'svelte';

    export let origin: PhilippineAddress;
    export let destination: PhilippineAddress;
    export let weight: number;

    let shippingRates: ShippingRate[] = [];
    let loading = false;
    let error: string | null = null;
    let selectedCourier: string | null = null;

    const logisticsService = LogisticsService.getInstance();

    async function calculateRates() {
        loading = true;
        error = null;
        try {
            shippingRates = await logisticsService.calculateShippingRate(origin, destination, weight);
        } catch (e) {
            error = 'Failed to calculate shipping rates. Please try again.';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function selectCourier(courier: string) {
        selectedCourier = courier;
    }

    $: if (origin && destination && weight) {
        calculateRates();
    }
</script>

<div class="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Shipping Calculator</h2>

    {#if loading}
        <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
    {:else if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {:else if shippingRates.length > 0}
        <div class="space-y-4">
            {#each shippingRates as rate}
                <div 
                    class="p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:border-blue-500 hover:shadow-md
                    {selectedCourier === rate.courier ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
                    on:click={() => selectCourier(rate.courier)}
                >
                    <div class="flex justify-between items-center">
                        <div>
                            <h3 class="font-semibold text-lg capitalize">{rate.courier.replace('_', ' ')}</h3>
                            <p class="text-sm text-gray-600">Estimated delivery: {rate.estimatedDays} days</p>
                        </div>
                        <div class="text-right">
                            <p class="text-xl font-bold text-blue-600">₱{rate.total.toFixed(2)}</p>
                            <p class="text-xs text-gray-500">Base: ₱{rate.baseRate} + Weight: ₱{rate.weightRate} + Distance: ₱{rate.distanceRate}</p>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <p class="text-gray-500 text-center py-4">Enter shipping details to calculate rates</p>
    {/if}
</div> 