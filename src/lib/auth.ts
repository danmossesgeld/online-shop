import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';

// Enhanced signup with detailed error handling
export const signup = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Create user document in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userCredential.user.email,
      type: 'user', // Default type is 'user'
      createdAt: new Date()
    });
    return userCredential.user;
  } catch (error) {
    const firebaseError = error as AuthError;
    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        throw new Error('The email is already in use.');
      case 'auth/invalid-email':
        throw new Error('The email format is invalid.');
      case 'auth/weak-password':
        throw new Error('The password is too weak.');
      default:
        throw new Error('An error occurred during signup.');
    }
  }
};

// Get user type from Firestore
export const getUserType = async (uid: string): Promise<string> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().type;
    }
    // If document doesn't exist, create it
    await ensureUserDocument(uid);
    return 'user'; // Default type if not found
  } catch (error) {
    console.error('Error getting user type:', error);
    return 'user'; // Default type on error
  }
};

// Ensure user document exists
export const ensureUserDocument = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, 'users', uid), {
          email: user.email,
          type: 'user',
          createdAt: new Date()
        });
        console.log('Created user document for:', uid);
      }
    }
  } catch (error) {
    console.error('Error ensuring user document:', error);
  }
};

// Set user as admin
export const setUserAsAdmin = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      type: 'admin'
    });
    return true;
  } catch (error) {
    console.error('Error setting user as admin:', error);
    return false;
  }
};

// Create admin user
export const createAdminUser = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    // Create user document in Firestore with admin type
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email: userCredential.user.email,
      type: 'admin',
      createdAt: new Date()
    });
    return userCredential.user;
  } catch (error) {
    const firebaseError = error as AuthError;
    switch (firebaseError.code) {
      case 'auth/email-already-in-use':
        throw new Error('The email is already in use.');
      case 'auth/invalid-email':
        throw new Error('The email format is invalid.');
      case 'auth/weak-password':
        throw new Error('The password is too weak.');
      default:
        throw new Error('An error occurred during signup.');
    }
  }
};

// Enhanced login with detailed error handling
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Ensure user document exists when logging in
    await ensureUserDocument(userCredential.user.uid);
    return userCredential.user;
  } catch (error) {
    const firebaseError = error as AuthError;
    switch (firebaseError.code) {
      case 'auth/user-not-found':
        throw new Error('No user found with this email.');
      case 'auth/wrong-password':
        throw new Error('Incorrect password.');
      case 'auth/invalid-email':
        throw new Error('The email format is invalid.');
      default:
        throw new Error('An error occurred during login.');
    }
  }
};

// Logout function with enhanced error handling
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('An error occurred during logout.');
  }
};

// Scan all users and their types
export const scanUserTypes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      email: doc.data().email,
      type: doc.data().type
    }));
    console.table(users); // This will show a nice table in the console
    return users;
  } catch (error) {
    console.error('Error scanning user types:', error);
    return [];
  }
};
