import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type AuthError } from 'firebase/auth';
import { auth } from './firebase';

// Enhanced signup with detailed error handling
export const signup = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
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
