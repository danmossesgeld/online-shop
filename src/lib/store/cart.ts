import { writable, derived, get } from 'svelte/store';
import { getFirestore, doc, updateDoc, getDoc, setDoc, collection, addDoc, serverTimestamp, type DocumentData } from 'firebase/firestore';
import { auth } from '$lib/firebase';
import { notifications } from '$lib/components/Notification.svelte';
import { browser } from '$app/environment';

// Define strict types for cart items
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  thumbnail: string | null;
  variationPrice?: number | null;
  selectedVariations?: Record<string, string> | null;
}

// Define strict types for Firestore cart data
interface FirestoreCartData {
  items: CartItem[];
  lastUpdated: Date;
}

// Define strict types for order data
interface OrderData {
  userId: string;
  items: CartItem[];
  totalPrice: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  timestamp: Date;
  userEmail: string | null;
}

function createCart() {
  const { subscribe, set, update } = writable<CartItem[]>([]);
  const db = getFirestore();

  // Function to sync cart with Firestore with better error handling
  const syncCartWithFirestore = async (userId: string, items: CartItem[]): Promise<void> => {
    try {
      const cartRef = doc(db, 'users', userId, 'cart', 'items');
      const cartData: FirestoreCartData = {
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity || 1,
          thumbnail: item.thumbnail,
          variationPrice: item.variationPrice || null,
          selectedVariations: item.selectedVariations || null
        })),
        lastUpdated: new Date()
      };
      await setDoc(cartRef, cartData);
    } catch (err) {
      console.error('Error syncing cart with Firestore:', err);
      notifications.add('Error saving cart', 'error');
      throw new Error('Failed to sync cart with Firestore');
    }
  };

  // Load cart from Firestore with better error handling
  const loadCart = async (): Promise<void> => {
    const user = auth.currentUser;
    if (!user) {
      set([]);
      return;
    }

    try {
      const cartRef = doc(db, 'users', user.uid, 'cart', 'items');
      const cartDoc = await getDoc(cartRef);
      
      if (cartDoc.exists()) {
        const data = cartDoc.data() as FirestoreCartData;
        set(data.items || []);
      } else {
        await setDoc(cartRef, { items: [], lastUpdated: new Date() });
        set([]);
      }
    } catch (err) {
      console.error('Error loading cart from Firestore:', err);
      notifications.add('Error loading cart', 'error');
      set([]);
    }
  };

  // Initialize cart
  if (browser) {
    loadCart();
  }

  const store = {
    subscribe,
    addItem: (item: Omit<CartItem, 'quantity'>): void => {
      if (!browser) return;
      
      update(items => {
        const user = auth.currentUser;
        if (!user) {
          notifications.add('Please log in to add items to cart', 'error');
          return items;
        }

        const existingItemIndex = items.findIndex(i => 
          i.id === item.id && 
          JSON.stringify(i.selectedVariations) === JSON.stringify(item.selectedVariations)
        );

        let newItems: CartItem[];
        if (existingItemIndex >= 0) {
          newItems = items.map((i, index) => 
            index === existingItemIndex
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        } else {
          newItems = [...items, { ...item, quantity: 1 }];
        }

        syncCartWithFirestore(user.uid, newItems).catch(console.error);
        return newItems;
      });
    },
    removeItem: (itemId: string, selectedVariations?: Record<string, string>): void => {
      if (!browser) return;
      
      update(items => {
        const user = auth.currentUser;
        if (!user) {
          notifications.add('Please log in to remove items from cart', 'error');
          return items;
        }

        const newItems = items.filter(i => 
          !(i.id === itemId && 
            JSON.stringify(i.selectedVariations) === JSON.stringify(selectedVariations))
        );
        
        syncCartWithFirestore(user.uid, newItems).catch(console.error);
        return newItems;
      });
    },
    updateQuantity: (itemId: string, quantity: number, selectedVariations?: Record<string, string>): void => {
      if (!browser) return;
      
      update(items => {
        const user = auth.currentUser;
        if (!user) {
          notifications.add('Please log in to update cart', 'error');
          return items;
        }

        const newItems = items.map(i => 
          i.id === itemId && 
          JSON.stringify(i.selectedVariations) === JSON.stringify(selectedVariations)
            ? { ...i, quantity }
            : i
        ).filter(i => i.quantity > 0);

        syncCartWithFirestore(user.uid, newItems).catch(console.error);
        return newItems;
      });
    },
    clear: (): void => {
      if (!browser) return;
      
      const user = auth.currentUser;
      if (!user) {
        notifications.add('Please log in to clear cart', 'error');
        return;
      }

      syncCartWithFirestore(user.uid, []).catch(console.error);
      set([]);
    }
  };

  return store;
}

export const cart = createCart();

// Derived stores with better type safety
export const cartCount = derived(cart, $cart => 
  $cart.reduce((sum, item) => sum + item.quantity, 0)
);

export const cartTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => {
    const price = item.variationPrice || item.price;
    return sum + price * item.quantity;
  }, 0)
);

// Export these functions to be used in components
export const addToCart = (item: Omit<CartItem, 'quantity'>): void => {
  cart.addItem(item);
};

export const removeFromCart = (itemId: string, selectedVariations?: Record<string, string>): void => {
  cart.removeItem(itemId, selectedVariations);
};

export const updateCartQuantity = (itemId: string, quantity: number, selectedVariations?: Record<string, string>): void => {
  cart.updateQuantity(itemId, quantity, selectedVariations);
};

export const clearCart = (): void => {
  cart.clear();
};

// Checkout function with better error handling and type safety
export const checkout = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    notifications.add('Please log in to checkout', 'error');
    throw new Error('User must be logged in to checkout');
  }

  const cartData = get(cart);
  if (cartData.length === 0) {
    notifications.add('Cart is empty', 'error');
    throw new Error('Cart is empty');
  }

  try {
    // Clean and validate cart data before saving
    const cleanCartData = cartData.map(item => ({
      id: item.id,
      name: item.name || '',
      price: item.variationPrice || item.price || 0,
      quantity: item.quantity || 1,
      thumbnail: item.thumbnail || null,
      selectedVariations: item.selectedVariations || null
    }));

    // Create order document with cleaned data
    const orderData: OrderData = {
      userId: user.uid,
      items: cleanCartData,
      totalPrice: get(cartTotal),
      status: 'pending',
      timestamp: new Date(),
      userEmail: user.email || null
    };

    const orderRef = await addDoc(collection(getFirestore(), 'orders'), {
      ...orderData,
      timestamp: serverTimestamp()
    });

    // Clear cart after successful checkout
    cart.clear();
    notifications.add('Order placed successfully!', 'success');
    return orderRef.id;
  } catch (error) {
    console.error('Error during checkout:', error);
    notifications.add('Failed to process checkout', 'error');
    throw new Error('Failed to process checkout');
  }
};
