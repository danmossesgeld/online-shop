<script lang="ts">
  // Define strict types
  type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  type SpinnerColor = 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'pink' | 'indigo' | 'gray';

  interface LoadingSpinnerProps {
    message?: string;
    size: SpinnerSize;
    color: SpinnerColor;
    fullScreen?: boolean;
    pulse?: boolean;
    bordered?: boolean;
    centered?: boolean;
    customClass?: string;
  }

  // Props with strict types and required values
  export let message: LoadingSpinnerProps['message'] = '';
  export let size: LoadingSpinnerProps['size'] = 'md';
  export let color: LoadingSpinnerProps['color'] = 'blue';
  export let fullScreen: LoadingSpinnerProps['fullScreen'] = false;
  export let pulse: LoadingSpinnerProps['pulse'] = false;
  export let bordered: LoadingSpinnerProps['bordered'] = false;
  export let centered: LoadingSpinnerProps['centered'] = true;
  export let customClass: LoadingSpinnerProps['customClass'] = '';

  // Constants
  const sizeClasses: Record<SpinnerSize, string> = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const colorClasses: Record<SpinnerColor, string> = {
    blue: 'text-primary',
    orange: 'text-primary',
    green: 'text-success',
    red: 'text-error',
    purple: 'text-secondary',
    pink: 'text-accent',
    indigo: 'text-info',
    gray: 'text-base-content/60'
  };

  // Computed classes
  $: spinnerClasses = [
    sizeClasses[size],
    colorClasses[color],
    bordered ? 'border-2 border-current rounded-full' : '',
    pulse ? 'animate-pulse' : 'animate-spin',
    'transform-gpu'
  ].filter(Boolean).join(' ');

  $: containerClasses = [
    centered ? 'flex items-center justify-center w-full h-full' : 'flex items-center',
    customClass
  ].filter(Boolean).join(' ');

  // Generate unique IDs for accessibility
  const loadingId = `loading-${Math.random().toString(36).substring(2, 9)}`;
</script>

{#if fullScreen}
  <div 
    class="fixed inset-0 bg-base-100/80 backdrop-blur-sm z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-label="Loading overlay"
    aria-describedby={loadingId}
  >
    <div class="flex flex-col items-center justify-center space-y-4">
      <svg 
        class={spinnerClasses}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <circle 
          class="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          stroke-width="4"
        />
        <path 
          class="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {#if message}
        <p class="text-base-content font-medium" id={loadingId}>{message}</p>
      {/if}
    </div>
  </div>
{:else}
  <div 
    class={containerClasses} 
    role="status" 
    aria-live="polite"
    aria-busy="true"
    aria-describedby={loadingId}
  >
    <div class="flex flex-col items-center justify-center space-y-2">
      <svg 
        class={spinnerClasses}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        <circle 
          class="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          stroke-width="4"
        />
        <path 
          class="opacity-75" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {#if message}
        <p class="text-base-content text-sm" id={loadingId}>{message}</p>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Optimize animations with hardware acceleration */
  .animate-pulse {
    animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    will-change: opacity;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  /* Optimized spin animation with faster duration */
  .animate-spin {
    animation: spin 0.6s linear infinite;
    will-change: transform;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  /* Optimize SVG rendering */
  svg {
    shape-rendering: geometricPrecision;
    text-rendering: geometricPrecision;
    transform: translateZ(0);
    backface-visibility: hidden;
  }

  /* Add transition for smoother state changes */
  .fixed {
    transition: opacity 0.2s ease-in-out;
  }
</style>
