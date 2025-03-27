import { writable, derived, get } from 'svelte/store';
import { getFirestore, doc, updateDoc, getDoc, setDoc, collection, addDoc, serverTimestamp, onSnapshot, type DocumentData } from 'firebase/firestore';
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
  selectedVariations: Record<string, string> | null;
  variations?: Record<string, string[]> | null;
}

// Define strict types for cart item references
export interface CartItemReference {
  id: string;
  quantity: number;
  selectedVariations: Record<string, string> | null;
}

// Define strict types for Firestore cart data
interface FirestoreCartData {
  items: CartItemReference[];
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

const PENDING_ORDER_KEY = 'pending_order_data';
const db = getFirestore();

// Helper function to check if user is authenticated
const checkAuth = (): string | null => {
  const user = auth.currentUser;
  if (!user) {
    notifications.add('Please log in to perform this action', 'error');
    return null;
  }
  return user.uid;
};

// Helper function to fetch item details
async function fetchItemDetails(itemId: string): Promise<CartItem | null> {
  try {
    if (!itemId) {
      console.error('Invalid item ID');
      return null;
    }

    // Get the item directly from the 'items' collection
    const itemDoc = await getDoc(doc(db, 'items', itemId));
    if (!itemDoc.exists()) {
      console.error('Item not found:', itemId);
      return null;
    }

    const itemData = itemDoc.data();
    return {
      id: itemId,
      name: itemData.itemName || '',
      price: Number(itemData.price) || 0,
      quantity: 0, // This will be set by the cart reference
      thumbnail: itemData.thumbnail || null,
      variationPrice: itemData.variationPrice ? Number(itemData.variationPrice) : null,
      selectedVariations: null, // This will be set by the cart reference
      variations: itemData.variations || null
    };
  } catch (err) {
    console.error('Error fetching item details:', err);
    return null;
  }
}

// Helper function to sync cart with Firestore
const syncCartWithFirestore = async (userId: string, items: CartItemReference[]): Promise<void> => {
  try {
    // Store cart items in users/{userId}/cart/items
    const cartRef = doc(db, 'users', userId, 'cart', 'items');
    const cartData: FirestoreCartData = {
      items: items.map(item => ({
        id: item.id,
        quantity: Number(item.quantity) || 1,
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

// Helper function to convert CartItem to CartItemReference
function toCartItemReference(item: CartItem): CartItemReference {
  return {
    id: item.id,
    quantity: item.quantity,
    selectedVariations: item.selectedVariations
  };
}

// Helper function to convert CartItemReference to CartItem
async function toCartItem(ref: CartItemReference): Promise<CartItem | null> {
  const itemDetails = await fetchItemDetails(ref.id);
  if (!itemDetails) return null;
  
  return {
    ...itemDetails,
    quantity: ref.quantity,
    selectedVariations: ref.selectedVariations
  };
}

// Define the cart store type
type CartStore = {
  subscribe: (run: (value: CartItem[]) => void, invalidate?: () => void) => () => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => Promise<void>;
  removeItem: (itemId: string, selectedVariations?: Record<string, string>) => void;
  updateQuantity: (itemId: string, quantity: number, selectedVariations?: Record<string, string>) => void;
  updateProductDetails: (productId: string) => Promise<void>;
  clear: () => void;
};

function createCart(): CartStore {
  const { subscribe, set, update } = writable<CartItem[]>([]);
  let unsubscribeAuth: (() => void) | null = null;
  let unsubscribeProducts: Record<string, () => void> = {};

  // Load cart from Firestore with better error handling
  const loadCart = async (): Promise<void> => {
    const userId = checkAuth();
    if (!userId) {
      set([]);
      return;
    }

    try {
      const cartRef = doc(db, 'users', userId, 'cart', 'items');
      
      // Set up real-time listener for cart changes
      onSnapshot(cartRef, async (cartDoc) => {
        if (cartDoc.exists()) {
          const data = cartDoc.data() as FirestoreCartData;
          // Fetch all item details in parallel
          const itemPromises = data.items.map(ref => toCartItem(ref));
          const items = (await Promise.all(itemPromises)).filter((item): item is CartItem => item !== null);
          
          // Set up real-time listeners for each product
          items.forEach(item => {
            if (!unsubscribeProducts[item.id]) {
              const productRef = doc(db, 'items', item.id);
              unsubscribeProducts[item.id] = onSnapshot(productRef, (productDoc) => {
                if (productDoc.exists()) {
                  const productData = productDoc.data();
                  update(currentItems => {
                    return currentItems.map(cartItem => {
                      if (cartItem.id === item.id) {
                        return {
                          ...cartItem,
                          name: productData.itemName || cartItem.name,
                          price: Number(productData.price) || cartItem.price,
                          thumbnail: productData.thumbnail || cartItem.thumbnail,
                          variations: productData.variations || cartItem.variations
                        };
                      }
                      return cartItem;
                    });
                  });
                }
              });
            }
          });
          
          set(items);
        } else {
          await setDoc(cartRef, { items: [], lastUpdated: new Date() });
          set([]);
        }
      });
    } catch (err) {
      console.error('Error loading cart from Firestore:', err);
      notifications.add('Error loading cart', 'error');
      set([]);
    }
  };

  // Initialize cart and set up auth state listener
  if (browser) {
    loadCart();
    unsubscribeAuth = auth.onAuthStateChanged((user) => {
      // Clean up previous listeners
      Object.values(unsubscribeProducts).forEach(unsubscribe => unsubscribe());
      unsubscribeProducts = {};

      if (user) {
        loadCart();
      } else {
        set([]);
      }
    });

    // Cleanup on page unload
    window.addEventListener('unload', () => {
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
      Object.values(unsubscribeProducts).forEach(unsubscribe => unsubscribe());
    });
  }

  const store: CartStore = {
    subscribe,
    addItem: async (item: Omit<CartItem, 'quantity'>): Promise<void> => {
      if (!browser) return;
      
      const userId = checkAuth();
      if (!userId) return;

      try {
        // Fetch the latest item details
        const itemDetails = await fetchItemDetails(item.id);
        if (!itemDetails) {
          notifications.add('Item not found', 'error');
          return;
        }

        update(items => {
          const existingItemIndex = items.findIndex(i => 
            i.id === item.id && 
            JSON.stringify(i.selectedVariations) === JSON.stringify(item.selectedVariations)
          );

          const newItems = existingItemIndex >= 0
            ? items.map((i, index) => 
                index === existingItemIndex
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              )
            : [...items, { ...itemDetails, quantity: 1, selectedVariations: item.selectedVariations }];

          // Convert to references for Firestore
          const cartRefs = newItems.map(toCartItemReference);

          // Fire and forget sync
          syncCartWithFirestore(userId, cartRefs).catch(console.error);
          return newItems;
        });
      } catch (err) {
        console.error('Error adding item to cart:', err);
        notifications.add('Error adding item to cart', 'error');
      }
    },
    removeItem: (itemId: string, selectedVariations?: Record<string, string>): void => {
      if (!browser) return;
      
      update(items => {
        const userId = checkAuth();
        if (!userId) return items;

        const newItems = items.filter(i => 
          !(i.id === itemId && 
            JSON.stringify(i.selectedVariations) === JSON.stringify(selectedVariations))
        );
        
        // Convert to references for Firestore
        const cartRefs = newItems.map(toCartItemReference);

        // Fire and forget sync
        syncCartWithFirestore(userId, cartRefs).catch(console.error);
        return newItems;
      });
    },
    updateQuantity: (itemId: string, quantity: number, selectedVariations?: Record<string, string>): void => {
      if (!browser) return;
      
      update(items => {
        const userId = checkAuth();
        if (!userId) return items;

        const newItems = items.map(item => {
          if (item.id === itemId && 
              JSON.stringify(item.selectedVariations) === JSON.stringify(selectedVariations)) {
            return { ...item, quantity };
          }
          return item;
        });

        // Convert to references for Firestore
        const cartRefs = newItems.map(toCartItemReference);

        // Fire and forget sync
        syncCartWithFirestore(userId, cartRefs).catch(console.error);
        return newItems;
      });
    },
    updateProductDetails: async (productId: string): Promise<void> => {
      if (!browser) return;
      
      const userId = checkAuth();
      if (!userId) return;

      try {
        // Get the latest item details
        const itemDetails = await fetchItemDetails(productId);
        if (!itemDetails) {
          console.error('Could not fetch updated item details');
          return;
        }

        update((items: CartItem[]) => {
          const updatedItems = items.map(item => {
            if (item.id === productId) {
              return {
                ...item,
                name: itemDetails.name,
                price: itemDetails.price,
                thumbnail: itemDetails.thumbnail,
                variations: itemDetails.variations
              };
            }
            return item;
          });

          // Convert to references and sync with Firestore
          const cartRefs = updatedItems.map(toCartItemReference);
          syncCartWithFirestore(userId, cartRefs).catch(console.error);
          
          return updatedItems;
        });
      } catch (err) {
        console.error('Error updating cart product details:', err);
        notifications.add('Error updating cart items', 'error');
      }
    },
    clear: (): void => {
      if (!browser) return;
      
      const userId = checkAuth();
      if (!userId) return;

      // Fire and forget sync
      syncCartWithFirestore(userId, []).catch(console.error);
      set([]);
    }
  };

  return store;
}

// Create and export the cart store and its actions
const cart = createCart();
export { cart };
export const addToCart = (item: Omit<CartItem, 'quantity'>): Promise<void> => cart.addItem(item);
export const removeFromCart = (itemId: string, selectedVariations?: Record<string, string>): void => cart.removeItem(itemId, selectedVariations);
export const updateQuantity = (itemId: string, quantity: number, selectedVariations?: Record<string, string>): void => cart.updateQuantity(itemId, quantity, selectedVariations);
export const updateCartProductDetails = (productId: string): Promise<void> => cart.updateProductDetails(productId);
export const clearCart = (): void => cart.clear();

// Export derived store for cart count
export const cartCount = derived(cart, ($cart) => $cart.reduce((total, item) => total + item.quantity, 0));

export const cartTotal = derived(cart, $cart =>
  $cart.reduce((sum, item) => {
    const price = item.variationPrice || item.price;
    return sum + price * item.quantity;
  }, 0)
);

// Local storage helpers for pending orders
export const setPendingOrderData = (items: CartItem[]): void => {
  if (browser) {
    localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(items.map(toCartItemReference)));
  }
};

export const getPendingOrderData = async (): Promise<CartItem[] | null> => {
  if (!browser) return null;
  
  try {
    const storedData = localStorage.getItem(PENDING_ORDER_KEY);
    if (!storedData) return null;

    const references = JSON.parse(storedData) as CartItemReference[];
    const itemPromises = references.map(ref => toCartItem(ref));
    const items = (await Promise.all(itemPromises)).filter((item): item is CartItem => item !== null);
    return items;
  } catch (error) {
    console.error('Error reading pending order data:', error);
    return null;
  }
};

export const clearPendingOrderData = (): void => {
  if (browser) {
    localStorage.removeItem(PENDING_ORDER_KEY);
  }
};

// Modify the checkout function
export const checkout = async (): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    notifications.add('Please log in to checkout', 'error');
    throw new Error('User must be logged in to checkout');
  }

  // Use pending order data if available, otherwise use current cart
  const cartData = await getPendingOrderData() || get(cart);
  if (cartData.length === 0) {
    notifications.add('Cart is empty', 'error');
    throw new Error('Cart is empty');
  }

  try {
    // Create order document with cleaned data
    const orderData: OrderData = {
      userId: user.uid,
      items: cartData,
      totalPrice: cartData.reduce((sum, item) => {
        const price = item.variationPrice || item.price;
        return sum + price * item.quantity;
      }, 0),
      status: 'pending',
      timestamp: new Date(),
      userEmail: user.email || null
    };

    // Save order to Firestore
    const orderRef = await addDoc(collection(getFirestore(), 'orders'), {
      ...orderData,
      timestamp: serverTimestamp()
    });

    if (!orderRef.id) {
      throw new Error('Failed to create order document');
    }

    // Verify the order was saved by fetching it back
    const savedOrder = await getDoc(orderRef);
    if (!savedOrder.exists()) {
      throw new Error('Order was not properly saved');
    }

    // Clear pending order data after successful order creation
    clearPendingOrderData();
    return orderRef.id;
  } catch (error) {
    console.error('Error during checkout:', error);
    notifications.add('Failed to process checkout', 'error');
    throw new Error('Failed to process checkout');
  }
};
