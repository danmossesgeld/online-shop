<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, setAuthUser, setAuthLoading, setAuthError } from '$lib/store/auth';
  import { auth } from '$lib/firebase';
  import { onAuthStateChanged } from 'firebase/auth';
  import { ensureUserDocument, getUserType } from '$lib/auth';
  import LoadingSpinner from './LoadingSpinner.svelte';

  // Props
  export let loginPath: string = '/login';
  export let publicRoutes: string[] = ['/login']; // Routes that don't require auth
  export let spinnerColor: 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'pink' | 'indigo' | 'gray' = 'blue';
  export let spinnerMessage: string = '';

  // Local state
  let unsubscribe: (() => void) | undefined;
  let currentPath: string = '';
  let isPublicRoute: boolean = false;
  let authCheckInProgress = false;
  
  // Cache for paths that have been checked
  const checkedPaths = new Set<string>();
  
  // Check if current path is a public route
  $: {
    currentPath = $page?.url?.pathname || '';
    isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
  }

  // Optimized authentication state change handler with debouncing
  function setupAuthListener() {
    // Prevent setting up multiple listeners
    if (typeof unsubscribe === 'function' || authCheckInProgress) return;
    
    // Set to prevent concurrent checks
    authCheckInProgress = true;
    
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // Skip processing if we're on a public route and already loaded
        if (isPublicRoute && !$authStore.isLoading && checkedPaths.has(currentPath)) {
          authCheckInProgress = false;
          return;
        }
        
        setAuthLoading(true);
        
        if (user) {
          // Use cached user data if available in store
          if ($authStore.isAuthenticated && $authStore.userData && $authStore.user?.uid === user.uid) {
            setAuthLoading(false);
            checkedPaths.add(currentPath);
            authCheckInProgress = false;
            return;
          }
          
          // Get user data with caching
          const userData = await ensureUserDocument(user.uid);
          if (userData) {
            setAuthUser(user, userData);
          } else {
            // If no user data, get user type and create basic user data
            const userType = await getUserType(user.uid);
            const basicUserData = {
              email: user.email || '',
              type: userType,
              createdAt: new Date()
            };
            setAuthUser(user, basicUserData);
          }
        } else {
          // User is not logged in
          setAuthUser(null);
          
          // Only redirect if not on a public route
          if (!isPublicRoute) {
            goto(loginPath);
          }
        }
        
        // Mark this path as checked
        checkedPaths.add(currentPath);
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthError(error instanceof Error ? error.message : 'Authentication error');
      } finally {
        setAuthLoading(false);
        authCheckInProgress = false;
      }
    });
  }

  onMount(() => {
    setupAuthListener();
  });

  onDestroy(() => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
</script>

{#if $authStore.isLoading && !isPublicRoute}
  <LoadingSpinner 
    message={spinnerMessage} 
    fullScreen={true} 
    color={spinnerColor} 
    size="lg"
  />
{:else if $authStore.isAuthenticated || isPublicRoute}
  <slot />
{/if} 