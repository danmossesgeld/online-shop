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
  export let message: LoadingSpinnerProps['message'] = 'Loading...';
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
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    green: 'text-green-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
    indigo: 'text-indigo-500',
    gray: 'text-gray-500'
  };

  // Computed classes
  $: spinnerClasses = [
    'material-symbols-outlined',
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
    class="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-label="Loading overlay"
    aria-describedby={loadingId}
  >
    <div class="flex flex-col items-center justify-center space-y-4">
      <div class="flex items-center justify-center w-8 h-8">
        <span 
          class={spinnerClasses}
          aria-hidden="true"
        >
          sync
        </span>
      </div>
      <p class="text-gray-700 font-medium" id={loadingId}>{message}</p>
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
      <div class="flex items-center justify-center w-8 h-8">
        <span 
          class={spinnerClasses}
          aria-hidden="true"
        >
          sync
        </span>
      </div>
      <p class="text-gray-700 text-sm" id={loadingId}>{message}</p>
    </div>
  </div>
{/if}

<style>
  /* Optimize animations with hardware acceleration */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    will-change: opacity;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  /* Ensure the icon rotates around its center point */
  .material-symbols-outlined {
    transform-origin: center;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    will-change: transform;
  }

  /* Override Tailwind's animate-spin with optimized version */
  .animate-spin {
    animation: spin 1s linear infinite;
    will-change: transform;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
</style>
