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

<div class="card bg-base-100 shadow-xl w-full max-w-2xl mx-auto">
    <div class="card-body">
        <h2 class="card-title text-2xl font-bold text-base-content">Shipping Calculator</h2>

        {#if loading}
            <div class="flex justify-center items-center py-8">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
        {:else if error}
            <div class="alert alert-error" role="alert">
                <span class="block sm:inline">{error}</span>
            </div>
        {:else if shippingRates.length > 0}
            <div class="space-y-4">
                {#each shippingRates as rate}
                    <div 
                        class="card bg-base-200 cursor-pointer transition-all duration-200 hover:shadow-lg
                        {selectedCourier === rate.courier ? 'border-2 border-primary' : ''}"
                        on:click={() => selectCourier(rate.courier)}
                    >
                        <div class="card-body">
                            <div class="flex justify-between items-center">
                                <div>
                                    <h3 class="font-semibold text-lg capitalize text-base-content">{rate.courier.replace('_', ' ')}</h3>
                                    <p class="text-sm text-base-content/70">Estimated delivery: {rate.estimatedDays} days</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xl font-bold text-primary">₱{rate.total.toFixed(2)}</p>
                                    <p class="text-xs text-base-content/50">Base: ₱{rate.baseRate} + Weight: ₱{rate.weightRate} + Distance: ₱{rate.distanceRate}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/each}
            </div>
        {:else}
            <p class="text-base-content/50 text-center py-4">Enter shipping details to calculate rates</p>
        {/if}
    </div>
</div> 