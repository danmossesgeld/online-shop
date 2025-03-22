import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs, type DocumentData } from 'firebase/firestore';

// Define strict types for error codes
type AuthErrorCode = 'auth/email-already-in-use' | 'auth/invalid-email' | 'auth/weak-password' | 'auth/user-not-found' | 'auth/wrong-password';

const handleAuthError = (error: AuthError): Error => {
  const errorMessages: Record<AuthErrorCode, string> = {
    'auth/email-already-in-use': 'The email is already in use.',
    'auth/invalid-email': 'The email format is invalid.',
    'auth/weak-password': 'The password is too weak.',
    'auth/user-not-found': 'No user found with this email.',
    'auth/wrong-password': 'Incorrect password.'
  };
  return new Error(errorMessages[error.code as AuthErrorCode] || 'An unknown error occurred.');
};

// Define strict types for user data
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

// Define strict types for signup data
export interface SignupData {
  firstName: string;
  lastName: string;
  midName: string;
  address: string;
  contactNumber: string;
  type: 'user' | 'admin';
}

// Enhanced signup with better type safety and error handling
export const signup = async (email: string, password: string, userData: SignupData): Promise<UserData> => {
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
    return userDoc;
  } catch (error) {
    console.error('Error in signup:', error);
    throw handleAuthError(error as AuthError);
  }
};

// Get user type with better type safety
export const getUserType = async (uid: string): Promise<'user' | 'admin'> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return (userDoc.exists() ? userDoc.data().type : 'user') as 'user' | 'admin';
  } catch (error) {
    console.error('Error getting user type:', error);
    return 'user';
  }
};

// Ensure user document exists with better type safety
export const ensureUserDocument = async (uid: string): Promise<void> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists() && auth.currentUser) {
      const userData: UserData = {
        email: auth.currentUser.email || '',
        type: 'user',
        createdAt: new Date()
      };
      await setDoc(doc(db, 'users', uid), userData);
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
    throw new Error('Failed to ensure user document exists');
  }
};

// Set user as admin with better error handling
export const setUserAsAdmin = async (uid: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'users', uid), { type: 'admin' });
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
};

// Enhanced login with better error handling
export const login = async (email: string, password: string): Promise<UserData> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await ensureUserDocument(userCredential.user.uid);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    return userDoc.data() as UserData;
  } catch (error) {
    throw handleAuthError(error as AuthError);
  }
};

// Logout function with better error handling
export const logout = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Error during logout:', error);
    throw new Error('Failed to logout. Please try again.');
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
