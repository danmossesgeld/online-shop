import { writable } from 'svelte/store';
import { notifications } from './notifications';

interface CartItem {
  id: string;
  name: string;
  price: number;
  thumbnail: string;
  quantity: number;
  variations?: Record<string, string>;
}

// Initialize the cart with the localStorage value or an empty array
let initialCart: CartItem[] = [];

try {
  const storedCart = localStorage.getItem('cart');
  if (storedCart) {
    initialCart = JSON.parse(storedCart);
    // Check if the loaded cart is valid
    if (!Array.isArray(initialCart) || initialCart.some(item => !item.id || !item.quantity)) {
      throw new Error('Invalid cart data in localStorage');
    }
  }
} catch (error) {
  console.error('Error loading cart from localStorage:', error);
  initialCart = []; // Fallback to empty cart if there's any error
}

export const cart = writable<CartItem[]>(initialCart);

// Persist cart to localStorage whenever it changes
cart.subscribe((items) => {
  try {
    localStorage.setItem('cart', JSON.stringify(items));
  } catch (error) {
    console.error('Error saving cart to localStorage:', error);
  }
});

// Function to add an item to the cart
export function addToCart(item: Omit<CartItem, 'quantity'>) {
  cart.update((currentCart) => {
    const existingItem = currentCart.find((i) => 
      i.id === item.id && 
      JSON.stringify(i.variations) === JSON.stringify(item.variations)
    );
    
    if (existingItem) {
      existingItem.quantity += 1;
      notifications.add(`Updated quantity of ${item.name} in cart`);
    } else {
      currentCart.push({ ...item, quantity: 1 });
      notifications.add(`Added ${item.name} to cart`);
    }
    return currentCart;
  });
}

// Function to remove an item from the cart
export function removeFromCart(itemId: string) {
  cart.update((currentCart) => currentCart.filter((item) => item.id !== itemId));
}

// Function to get the total quantity of items in the cart (sum of quantities)
export function getCartItemCount(): number {
  let count = 0;
  cart.subscribe((items) => {
    count = items.reduce((total, item) => total + item.quantity, 0);
  })();
  return count;
}

// Function to clear the entire cart
export function clearCart() {
  cart.set([]);
  localStorage.removeItem('cart'); // Also clear the cart from localStorage
}
