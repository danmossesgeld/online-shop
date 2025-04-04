<script lang="ts">
    import { LogisticsService } from '$lib/services/logisticsService';
    import type { TrackingInfo, ShipmentStatus } from '$lib/types/logistics';
    import { onMount } from 'svelte';

    export let trackingNumber: string;

    let trackingInfo: TrackingInfo | null = null;
    let loading = false;
    let error: string | null = null;

    const logisticsService = LogisticsService.getInstance();

    async function trackShipment() {
        if (!trackingNumber) return;
        
        loading = true;
        error = null;
        try {
            trackingInfo = await logisticsService.trackShipment(trackingNumber);
        } catch (e) {
            error = 'Failed to track shipment. Please check your tracking number.';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    $: if (trackingNumber) {
        trackShipment();
    }

    function getStatusColor(status: ShipmentStatus): string {
        const colors: Record<ShipmentStatus, string> = {
            pending: 'badge badge-warning',
            processing: 'badge badge-info',
            in_transit: 'badge badge-secondary',
            out_for_delivery: 'badge badge-success',
            delivered: 'badge badge-neutral'
        };
        return colors[status];
    }
</script>

<div class="card bg-base-100 shadow-xl w-full max-w-2xl mx-auto">
    <div class="card-body">
        <h2 class="card-title text-2xl font-bold text-base-content">Track Shipment</h2>

        {#if loading}
            <div class="flex justify-center items-center py-8">
                <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
        {:else if error}
            <div class="alert alert-error" role="alert">
                <span class="block sm:inline">{error}</span>
            </div>
        {:else if trackingInfo}
            <div class="space-y-6">
                <!-- Current Status -->
                <div class="card bg-base-200">
                    <div class="card-body">
                        <div class="flex justify-between items-center mb-4">
                            <h3 class="text-lg font-semibold text-base-content">Current Status</h3>
                            <span class="{getStatusColor(trackingInfo.status)}">
                                {trackingInfo.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </div>
                        <p class="text-base-content/70">Location: {trackingInfo.currentLocation}</p>
                        <p class="text-base-content/70">Estimated Delivery: {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}</p>
                    </div>
                </div>

                <!-- Tracking History -->
                <div>
                    <h3 class="text-lg font-semibold mb-4 text-base-content">Tracking History</h3>
                    <div class="space-y-4">
                        {#each trackingInfo.history as history}
                            <div class="flex items-start space-x-4">
                                <div class="flex-shrink-0">
                                    <div class="w-2 h-2 rounded-full bg-primary mt-2"></div>
                                </div>
                                <div class="flex-grow">
                                    <p class="font-medium text-base-content">{history.status.replace('_', ' ').toUpperCase()}</p>
                                    <p class="text-sm text-base-content/70">{history.location}</p>
                                    <p class="text-sm text-base-content/50">{new Date(history.timestamp).toLocaleString()}</p>
                                    <p class="text-sm text-base-content/80 mt-1">{history.description}</p>
                                </div>
                            </div>
                        {/each}
                    </div>
                </div>
            </div>
        {:else}
            <p class="text-base-content/50 text-center py-4">Enter tracking number to view shipment status</p>
        {/if}
    </div>
</div> 