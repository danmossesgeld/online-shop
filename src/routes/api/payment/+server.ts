import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { PAYMONGO_SECRET_KEY } from '$env/static/private';
import { PUBLIC_BASE_URL } from '$env/static/public';

interface PaymentRequest {
    amount: number;
    items: Array<{
        id: string;
        name: string;
        price: number;
        quantity: number;
        thumbnail: string | null;
        variationPrice?: number | null;
        selectedVariations?: Record<string, string> | null;
    }>;
}

export async function POST({ request }: RequestEvent) {
    try {
        if (!PAYMONGO_SECRET_KEY) {
            throw new Error('PayMongo secret key is not configured');
        }

        const { amount, items } = await request.json() as PaymentRequest;
        const timestamp = Date.now();

        const response = await fetch('https://api.paymongo.com/v1/checkout_sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY).toString('base64')}`
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        send_email_receipt: false,
                        show_description: true,
                        show_line_items: true,
                        payment_method_types: ['card', 'gcash'],
                        line_items: items.map(item => ({
                            name: item.name,
                            quantity: item.quantity,
                            amount: Math.round((item.variationPrice || item.price) * 100),
                            currency: 'PHP',
                            description: item.selectedVariations && Object.keys(item.selectedVariations).length > 0 ? 
                                Object.entries(item.selectedVariations)
                                    .map(([key, value]) => `${key}: ${value}`)
                                    .join(', ') : 
                                `${item.name} - Standard item`
                        })),
                        payment_intent_data: {
                            capture_type: 'automatic'
                        },
                        success_url: `${PUBLIC_BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&timestamp=${timestamp}`,
                        cancel_url: `${PUBLIC_BASE_URL}/checkout?canceled=true&timestamp=${timestamp}`,
                        description: `Order for ${items.length} items`,
                        billing: null
                    }
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('PayMongo API Error:', data);
            throw new Error(data.errors?.[0]?.detail || 'Failed to create checkout session');
        }

        return json({
            checkoutUrl: data.data.attributes.checkout_url
        });
    } catch (error) {
        console.error('Payment creation error:', error);
        return json(
            { error: error instanceof Error ? error.message : 'Failed to create payment' },
            { status: 500 }
        );
    }
} 