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
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            in_transit: 'bg-purple-100 text-purple-800',
            out_for_delivery: 'bg-green-100 text-green-800',
            delivered: 'bg-gray-100 text-gray-800'
        };
        return colors[status];
    }
</script>

<div class="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-gray-800">Track Shipment</h2>

    {#if loading}
        <div class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
    {:else if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span class="block sm:inline">{error}</span>
        </div>
    {:else if trackingInfo}
        <div class="space-y-6">
            <!-- Current Status -->
            <div class="bg-white p-4 rounded-lg border border-gray-200">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-lg font-semibold">Current Status</h3>
                    <span class="px-3 py-1 rounded-full text-sm font-medium {getStatusColor(trackingInfo.status)}">
                        {trackingInfo.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                <p class="text-gray-600">Location: {trackingInfo.currentLocation}</p>
                <p class="text-gray-600">Estimated Delivery: {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}</p>
            </div>

            <!-- Tracking History -->
            <div>
                <h3 class="text-lg font-semibold mb-4">Tracking History</h3>
                <div class="space-y-4">
                    {#each trackingInfo.history as history}
                        <div class="flex items-start space-x-4">
                            <div class="flex-shrink-0">
                                <div class="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                            </div>
                            <div class="flex-grow">
                                <p class="font-medium">{history.status.replace('_', ' ').toUpperCase()}</p>
                                <p class="text-sm text-gray-600">{history.location}</p>
                                <p class="text-sm text-gray-500">{new Date(history.timestamp).toLocaleString()}</p>
                                <p class="text-sm text-gray-700 mt-1">{history.description}</p>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {:else}
        <p class="text-gray-500 text-center py-4">Enter tracking number to view shipment status</p>
    {/if}
</div> 