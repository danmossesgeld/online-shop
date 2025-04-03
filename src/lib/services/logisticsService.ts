import { PUBLIC_FIREBASE_API_KEY } from '$env/static/public';
import { db } from '$lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import type { PhilippineAddress, ShippingRate, TrackingInfo } from '$lib/types/logistics';

// Base rates for different courier services (in PHP)
const COURIER_RATES = {
    'jt_express': {
        baseRate: 50,
        perKg: 15,
        maxWeight: 50
    },
    'ninja_van': {
        baseRate: 60,
        perKg: 18,
        maxWeight: 50
    },
    'flash_express': {
        baseRate: 45,
        perKg: 12,
        maxWeight: 50
    },
    'xde_logistics': {
        baseRate: 55,
        perKg: 16,
        maxWeight: 50
    },
    'lbc': {
        baseRate: 65,
        perKg: 20,
        maxWeight: 50
    }
};

export class LogisticsService {
    private static instance: LogisticsService;
    private readonly db = db;

    private constructor() {}

    public static getInstance(): LogisticsService {
        if (!LogisticsService.instance) {
            LogisticsService.instance = new LogisticsService();
        }
        return LogisticsService.instance;
    }

    async calculateShippingRate(
        origin: PhilippineAddress,
        destination: PhilippineAddress,
        weight: number
    ): Promise<ShippingRate[]> {
        try {
            // Get distance between origin and destination using Google Maps Distance Matrix API
            const distance = await this.calculateDistance(origin, destination);
            
            // Calculate rates for each courier
            const rates: ShippingRate[] = Object.entries(COURIER_RATES).map(([courier, rate]) => {
                const baseRate = rate.baseRate;
                const weightRate = Math.min(weight, rate.maxWeight) * rate.perKg;
                const distanceRate = Math.ceil(distance / 10) * 5; // 5 PHP per 10km
                const total = baseRate + weightRate + distanceRate;
                
                // Estimate delivery days based on distance
                const estimatedDays = Math.ceil(distance / 100) + 1; // 1 day per 100km + 1 day buffer

                return {
                    baseRate,
                    weightRate,
                    distanceRate,
                    total,
                    estimatedDays,
                    courier
                };
            });

            return rates;
        } catch (error) {
            console.error('Error calculating shipping rate:', error);
            throw new Error('Failed to calculate shipping rate');
        }
    }

    async createShipment(
        origin: PhilippineAddress,
        destination: PhilippineAddress,
        weight: number,
        courier: string
    ): Promise<TrackingInfo> {
        try {
            // Generate tracking number
            const trackingNumber = this.generateTrackingNumber(courier);
            
            // Create shipment record in Firestore
            const shipmentData = {
                trackingNumber,
                origin,
                destination,
                weight,
                courier,
                status: 'pending',
                createdAt: new Date(),
                estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days default
                history: [{
                    timestamp: new Date(),
                    status: 'pending',
                    location: origin.city,
                    description: 'Shipment created'
                }]
            };

            const docRef = await addDoc(collection(this.db, 'shipments'), shipmentData);
            
            return {
                trackingNumber,
                status: 'pending',
                currentLocation: origin.city,
                estimatedDelivery: shipmentData.estimatedDelivery,
                history: shipmentData.history
            };
        } catch (error) {
            console.error('Error creating shipment:', error);
            throw new Error('Failed to create shipment');
        }
    }

    async trackShipment(trackingNumber: string): Promise<TrackingInfo> {
        try {
            const shipmentsRef = collection(this.db, 'shipments');
            const q = query(shipmentsRef, where('trackingNumber', '==', trackingNumber));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                throw new Error('Shipment not found');
            }

            const shipmentData = querySnapshot.docs[0].data();
            return shipmentData as TrackingInfo;
        } catch (error) {
            console.error('Error tracking shipment:', error);
            throw new Error('Failed to track shipment');
        }
    }

    private async calculateDistance(origin: PhilippineAddress, destination: PhilippineAddress): Promise<number> {
        // In a real implementation, you would use Google Maps Distance Matrix API
        // For now, returning a mock distance
        return 100; // 100km mock distance
    }

    private generateTrackingNumber(courier: string): string {
        const prefix = courier.toUpperCase().substring(0, 2);
        const timestamp = Date.now().toString().slice(-8);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        return `${prefix}${timestamp}${random}`;
    }
} 