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
  let previousPath: string = '';
  let isPublicRoute: boolean = false;
  let authCheckInProgress = false;
  let initialAuthCheckComplete = false;
  
  // Cache for paths that have been checked
  const checkedPaths = new Set<string>();
  
  // Check if current path is a public route
  $: {
    previousPath = currentPath;
    currentPath = $page?.url?.pathname || '';
    isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
    
    // If we're navigating between authenticated routes, don't show loading
    const isNavigatingBetweenProtectedRoutes = 
      initialAuthCheckComplete && 
      $authStore.isAuthenticated && 
      !isPublicRoute && 
      previousPath && 
      !publicRoutes.some(route => previousPath.startsWith(route));
      
    if (isNavigatingBetweenProtectedRoutes) {
      // Mark as checked immediately to avoid loading flash
      checkedPaths.add(currentPath);
    }
  }

  // Optimized authentication state change handler with debouncing
  function setupAuthListener() {
    // Prevent setting up multiple listeners
    if (typeof unsubscribe === 'function' || authCheckInProgress) return;
    
    // Set to prevent concurrent checks
    authCheckInProgress = true;
    
    // Set initial loading state only if not a public route
    if (!isPublicRoute && !initialAuthCheckComplete) {
      setAuthLoading(true);
    }
    
    unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        // If navigating between protected routes and already authenticated
        // Skip processing to prevent flickering
        if (checkedPaths.has(currentPath) && $authStore.isAuthenticated && !isPublicRoute) {
          authCheckInProgress = false;
          return;
        }
        
        // Skip processing if we're on a public route and already loaded
        if (isPublicRoute && !$authStore.isLoading && checkedPaths.has(currentPath)) {
          authCheckInProgress = false;
          initialAuthCheckComplete = true;
          return;
        }
        
        if (user) {
          // Use cached user data if available in store
          if ($authStore.isAuthenticated && $authStore.userData && $authStore.user?.uid === user.uid) {
            setAuthLoading(false);
            checkedPaths.add(currentPath);
            authCheckInProgress = false;
            initialAuthCheckComplete = true;
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
          // User is not authenticated
          setAuthUser(null, null);
          setAuthLoading(false);
          
          // If not on a public route, redirect to login
          if (!isPublicRoute) {
            goto(loginPath, { replaceState: true });
          }
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        setAuthError(error instanceof Error ? error.message : 'Authentication error occurred');
      } finally {
        authCheckInProgress = false;
        initialAuthCheckComplete = true;
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

{#if $authStore.isLoading && !isPublicRoute && !initialAuthCheckComplete && !checkedPaths.has(currentPath)}
  <LoadingSpinner 
    message={spinnerMessage} 
    fullScreen={true} 
    color={spinnerColor} 
    size="lg"
  />
{:else if $authStore.isAuthenticated || isPublicRoute}
  <slot />
{/if} 