export interface PhilippineAddress {
    street: string;
    barangay: string;
    city: string;
    province: string;
    postalCode: string;
    region: string;
    country: string;
}

export type ShipmentStatus = 'pending' | 'processing' | 'in_transit' | 'out_for_delivery' | 'delivered';

export interface ShippingRate {
    baseRate: number;
    weightRate: number;
    distanceRate: number;
    total: number;
    estimatedDays: number;
    courier: string;
}

export interface TrackingInfo {
    trackingNumber: string;
    status: ShipmentStatus;
    currentLocation: string;
    estimatedDelivery: Date;
    history: TrackingHistory[];
}

export interface TrackingHistory {
    timestamp: Date;
    status: ShipmentStatus;
    location: string;
    description: string;
}

export interface ShippingCalculatorParams {
    origin: PhilippineAddress;
    destination: PhilippineAddress;
    weight: number; // in kilograms
    dimensions?: {
        length: number;
        width: number;
        height: number;
    };
} 