import { writable, derived } from 'svelte/store';
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

const db = getFirestore();

export interface Item {
  id: string;
  itemName: string;
  price: number;
  thumbnail: string;
  category: string;
  group?: string;
  subcategory?: string;
  description?: string;
  stock?: number;
  images?: string[];
  variations?: {
    Color?: string[];
    Memory?: string[];
    Storage?: string[];
    [key: string]: string[] | undefined;
  };
  productVariations?: {
    id: string;
    name: string;
    price?: number;
    combinations: Record<string, string>;
  }[];
  specs?: string[];
  detailedInfo?: string;
  createdAt?: Date;
  itemId?: string;
}

export interface Category {
  name: string;
  groups: Record<string, string[]>;
  icon: string;
}

// Create base stores
const _itemsStore = writable<Item[]>([]);
const _categoriesStore = writable<Category[]>([]);
const _loadingStore = writable(true);
const _errorStore = writable<string | null>(null);

// Create derived stores for public access
export const itemsStore = _itemsStore;
export const categoriesStore = _categoriesStore;
export const loadingStore = _loadingStore;
export const errorStore = _errorStore;

// Function to fetch items
export async function fetchItems() {
  try {
    _loadingStore.set(true);
    const querySnapshot = await getDocs(collection(db, 'items'));
    const items: Item[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        itemId: doc.id,
        ...data
      } as Item);
    });
    _itemsStore.set(items);
  } catch (err) {
    console.error('Error fetching items:', err);
    _errorStore.set('Error fetching items');
  } finally {
    _loadingStore.set(false);
  }
}

// Function to start real-time listener
let unsubscribeItems: (() => void) | null = null;
let unsubscribeCategories: (() => void) | null = null;

export function startItemsListener() {
  if (unsubscribeItems) return; // Already listening

  unsubscribeItems = onSnapshot(collection(db, 'items'), (snapshot) => {
    const items: Item[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({
        id: doc.id,
        itemId: doc.id,
        ...data
      } as Item);
    });
    _itemsStore.set(items);
  }, (error) => {
    console.error('Error listening to items:', error);
    _errorStore.set('Error loading items');
  });
}

export function startCategoriesListener() {
  if (unsubscribeCategories) return; // Already listening

  unsubscribeCategories = onSnapshot(collection(db, 'itemcategory'), (snapshot) => {
    const categories: Category[] = [];
    snapshot.forEach((doc) => {
      categories.push({
        name: doc.id,
        groups: doc.data(),
        icon: doc.data().icon || '<iconify-icon icon="material-symbols:category" class="text-orange-500"></iconify-icon>'
      });
    });
    _categoriesStore.set(categories);
  }, (error) => {
    console.error('Error listening to categories:', error);
    _errorStore.set('Error loading categories');
  });
}

export function stopItemsListener() {
  if (unsubscribeItems) {
    unsubscribeItems();
    unsubscribeItems = null;
  }
}

export function stopCategoriesListener() {
  if (unsubscribeCategories) {
    unsubscribeCategories();
    unsubscribeCategories = null;
  }
}

// Function to fetch categories
export async function fetchCategories() {
  try {
    _loadingStore.set(true);
    const querySnapshot = await getDocs(collection(db, 'itemcategory'));
    const categories: Category[] = [];
    querySnapshot.forEach((doc) => {
      categories.push({
        name: doc.id,
        groups: doc.data(),
        icon: doc.data().icon || '<iconify-icon icon="material-symbols:category" class="text-orange-500"></iconify-icon>'
      });
    });
    _categoriesStore.set(categories);
  } catch (err) {
    console.error('Error fetching categories:', err);
    _errorStore.set('Error fetching categories');
  } finally {
    _loadingStore.set(false);
  }
}

// Function to add an item
export async function addItem(item: Omit<Item, 'id'>) {
  try {
    _loadingStore.set(true);
    const docRef = doc(collection(db, 'items'));
    await setDoc(docRef, item);
    await fetchItems(); // Refresh items
    _errorStore.set(null);
  } catch (err) {
    console.error('Error adding item:', err);
    _errorStore.set('Error adding item');
    throw err;
  } finally {
    _loadingStore.set(false);
  }
}

// Function to update an item
export async function updateItem(id: string, item: Partial<Item>) {
  try {
    _loadingStore.set(true);
    const docRef = doc(db, 'items', id);
    await setDoc(docRef, item, { merge: true });
    await fetchItems(); // Refresh items
    _errorStore.set(null);
  } catch (err) {
    console.error('Error updating item:', err);
    _errorStore.set('Error updating item');
    throw err;
  } finally {
    _loadingStore.set(false);
  }
}

// Function to delete an item
export async function deleteItem(id: string) {
  try {
    _loadingStore.set(true);
    await deleteDoc(doc(db, 'items', id));
    await fetchItems(); // Refresh items
    _errorStore.set(null);
  } catch (err) {
    console.error('Error deleting item:', err);
    _errorStore.set('Error deleting item');
    throw err;
  } finally {
    _loadingStore.set(false);
  }
}

// Function to update categories
export async function updateCategories(category: string, data: any) {
  try {
    _loadingStore.set(true);
    const docRef = doc(db, 'itemcategory', category);
    await setDoc(docRef, data);
    await fetchCategories(); // Refresh categories
    _errorStore.set(null);
  } catch (err) {
    console.error('Error updating categories:', err);
    _errorStore.set('Error updating categories');
    throw err;
  } finally {
    _loadingStore.set(false);
  }
}

// Function to delete a category
export async function deleteCategory(category: string) {
  try {
    _loadingStore.set(true);
    await deleteDoc(doc(db, 'itemcategory', category));
    await fetchCategories(); // Refresh categories
    _errorStore.set(null);
  } catch (err) {
    console.error('Error deleting category:', err);
    _errorStore.set('Error deleting category');
    throw err;
  } finally {
    _loadingStore.set(false);
  }
}

// Initialize stores
fetchItems();
fetchCategories(); 