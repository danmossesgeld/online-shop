import { writable, get } from 'svelte/store';

export interface Product {
    id: string;
    itemName: string;
    price: number;
    thumbnail: string;
    category: string;
}

export const products = writable<Product[]>([]);

export function searchProducts(query: string): Product[] {
    const store = get(products);
    if (!query.trim()) return [];
    
    return store
        .filter((item: Product) => 
            item.itemName.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, 5); // Return only top 5 matches
} 