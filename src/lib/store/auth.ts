import { writable } from 'svelte/store';
import type { User } from 'firebase/auth';
import type { UserData } from '$lib/auth';

export interface AuthState {
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  userData: null,
  isLoading: true,
  isAuthenticated: false,
  isAdmin: false,
  error: null
};

export const authStore = writable<AuthState>(initialState);

export const clearAuthError = (): void => {
  authStore.update(state => ({ ...state, error: null }));
};

export const setAuthLoading = (isLoading: boolean): void => {
  authStore.update(state => ({ ...state, isLoading }));
};

export const setAuthError = (error: string): void => {
  authStore.update(state => ({ ...state, error }));
};

export const setAuthUser = (user: User | null, userData: UserData | null = null): void => {
  authStore.update(state => ({
    ...state,
    user,
    userData,
    isAuthenticated: !!user,
    isAdmin: userData?.type === 'admin',
    isLoading: false
  }));
};

export const clearAuthState = (): void => {
  authStore.set(initialState);
}; 