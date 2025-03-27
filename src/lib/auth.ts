import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, type DocumentData } from 'firebase/firestore';
import { authStore, setAuthUser, setAuthError, clearAuthState, setAuthLoading } from './store/auth';
import type { AuthState } from './store/auth';

// Consolidate error handling into a single type
type AuthErrorCode = 
  | 'auth/email-already-in-use'
  | 'auth/invalid-email'
  | 'auth/weak-password'
  | 'auth/user-not-found'
  | 'auth/wrong-password'
  | 'auth/invalid-credential'
  | 'auth/too-many-requests'
  | 'auth/network-request-failed';

const handleAuthError = (error: AuthError): Error => {
  const errorMessages: Record<AuthErrorCode, string> = {
    'auth/email-already-in-use': 'The email is already in use.',
    'auth/invalid-email': 'The email format is invalid.',
    'auth/weak-password': 'The password is too weak.',
    'auth/user-not-found': 'No user found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid login credentials.',
    'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.'
  };
  
  const errorMessage = errorMessages[error.code as AuthErrorCode] || 'An unknown error occurred.';
  setAuthError(errorMessage);
  return new Error(errorMessage);
};

// Consolidate user data types
export interface UserData {
  email: string;
  type: 'user' | 'admin';
  firstName?: string;
  lastName?: string;
  midName?: string;
  address?: string;
  contactNumber?: string;
  createdAt: Date;
}

export interface SignupData extends Omit<UserData, 'email' | 'createdAt'> {
  email: string;
}

// Optimize caching mechanism with a single cache class
class UserCache {
  private static instance: UserCache;
  private typeCache = new Map<string, { type: 'user' | 'admin'; timestamp: number }>();
  private dataCache = new Map<string, { data: UserData; timestamp: number }>();
  private readonly TTL = 1000 * 60 * 15; // 15 minutes

  private constructor() {}

  static getInstance(): UserCache {
    if (!UserCache.instance) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  setType(uid: string, type: 'user' | 'admin'): void {
    this.typeCache.set(uid, { type, timestamp: Date.now() });
  }

  setData(uid: string, data: UserData): void {
    this.dataCache.set(uid, { data, timestamp: Date.now() });
  }

  getType(uid: string): 'user' | 'admin' | null {
    const cached = this.typeCache.get(uid);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.type;
    }
    return null;
  }

  getData(uid: string): UserData | null {
    const cached = this.dataCache.get(uid);
    if (cached && Date.now() - cached.timestamp < this.TTL) {
      return cached.data;
    }
    return null;
  }

  clear(): void {
    this.typeCache.clear();
    this.dataCache.clear();
  }
}

const userCache = UserCache.getInstance();

// Optimize store access with a single subscription
let currentAuthState: AuthState;
authStore.subscribe(state => {
  currentAuthState = state;
})();

// Enhanced signup with better type safety, error handling, and store integration
export const signup = async (email: string, password: string, userData: SignupData): Promise<UserData> => {
  setAuthLoading(true);
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc: UserData = {
      firstName: userData.firstName,
      lastName: userData.lastName,
      midName: userData.midName,
      address: userData.address,
      contactNumber: userData.contactNumber,
      email,
      type: userData.type || 'user',
      createdAt: new Date()
    };

    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    // Update auth store and caches
    setAuthUser(user, userDoc);
    userCache.setData(user.uid, userDoc);
    userCache.setType(user.uid, userDoc.type);
    
    return userDoc;
  } catch (error) {
    console.error('Error in signup:', error);
    throw handleAuthError(error as AuthError);
  } finally {
    setAuthLoading(false);
  }
};

// Get user type with improved caching
export const getUserType = async (uid: string): Promise<'user' | 'admin'> => {
  // Check cache first with TTL validation
  const cachedData = userCache.getType(uid);
  if (cachedData) {
    return cachedData;
  }

  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userType = (userDoc.exists() ? userDoc.data().type : 'user') as 'user' | 'admin';
    
    // Cache the result with timestamp
    userCache.setType(uid, userType);
    return userType;
  } catch (error) {
    console.error('Error getting user type:', error);
    return 'user';
  }
};

// Optimize ensureUserDocument with better caching
export const ensureUserDocument = async (uid: string): Promise<UserData | null> => {
  try {
    // Check cache first
    const cachedData = userCache.getData(uid);
    if (cachedData) return cachedData;

    // If we have current user data in auth store, use it
    if (currentAuthState.userData?.email) {
      userCache.setData(uid, currentAuthState.userData);
      return currentAuthState.userData;
    }

    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists() && auth.currentUser) {
      const userData: UserData = {
        email: auth.currentUser.email || '',
        type: 'user',
        createdAt: new Date()
      };
      await setDoc(doc(db, 'users', uid), userData);
      userCache.setData(uid, userData);
      return userData;
    } else if (userDoc.exists()) {
      const userData = userDoc.data() as UserData;
      userCache.setData(uid, userData);
      return userData;
    }
    return null;
  } catch (error) {
    console.error('Error ensuring user document:', error);
    throw new Error('Failed to ensure user document exists');
  }
};

// Set user as admin with better error handling
export const setUserAsAdmin = async (uid: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', uid), { type: 'admin' });
    // Update cache
    if (userCache.getType(uid)) {
      userCache.setType(uid, 'admin');
    }
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
};

// Enhanced login with better error handling and store integration
export const login = async (email: string, password: string): Promise<UserData> => {
  setAuthLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    await ensureUserDocument(user.uid);
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    // Update auth store and caches
    const userData = userDoc.data() as UserData;
    setAuthUser(user, userData);
    userCache.setData(user.uid, userData);
    userCache.setType(user.uid, userData.type);
    
    return userData;
  } catch (error) {
    throw handleAuthError(error as AuthError);
  } finally {
    setAuthLoading(false);
  }
};

// Optimize logout with better cleanup
export const logout = async (): Promise<void> => {
  setAuthLoading(true);
  try {
    await signOut(auth);
    clearAuthState();
    userCache.clear();
  } catch (error) {
    console.error('Error during logout:', error);
    const errorMessage = 'Failed to logout. Please try again.';
    setAuthError(errorMessage);
    throw new Error(errorMessage);
  } finally {
    setAuthLoading(false);
  }
};

// Scan all users with better type safety
export const scanUserTypes = async (): Promise<Array<{ id: string; email: string; type: 'user' | 'admin' }>> => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      type: doc.data().type as 'user' | 'admin'
    }));
  } catch (error) {
    console.error('Error scanning user types:', error);
    return [];
  }
};

// Check if current user has admin rights (using cached state)
export const isAdmin = (): boolean => {
  return currentAuthState.isAdmin;
};

// Check if user is authenticated (using cached state)
export const isAuthenticated = (): boolean => {
  return currentAuthState.isAuthenticated;
};
