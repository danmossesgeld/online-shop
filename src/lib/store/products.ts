import { writable, derived } from 'svelte/store';

export interface Product {
    id: string;
    itemName: string;
    price: number;
    thumbnail: string;
    category: string;
}

export const products = writable<Product[]>([]);

export const searchProducts = (query: string) => derived(products, $products => {
    if (!query.trim()) return [];
    
    return $products
        .filter(item => 
            item.itemName.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5);
}); 