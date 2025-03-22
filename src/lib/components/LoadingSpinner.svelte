<script lang="ts">
  export let message = 'Loading...';
  export let size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' = 'md';
  export let color: 'blue' | 'orange' | 'green' | 'red' | 'purple' | 'pink' | 'indigo' | 'gray' = 'blue';
  export let fullScreen = false;
  export let pulse = false;
  export let bordered = false;
  export let centered = true;
  export let customClass = '';

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
    '2xl': 'w-20 h-20'
  };

  const colorClasses = {
    blue: 'text-blue-500',
    orange: 'text-orange-500',
    green: 'text-green-500',
    red: 'text-red-500',
    purple: 'text-purple-500',
    pink: 'text-pink-500',
    indigo: 'text-indigo-500',
    gray: 'text-gray-500'
  };

  const borderClasses = bordered ? 'border-2 border-current rounded-full' : '';
  const animationClasses = pulse ? 'animate-pulse' : 'animate-spin';
  const containerClasses = centered ? 'flex items-center justify-center w-full h-full' : 'flex items-center';
</script>

{#if fullScreen}
  <div 
    class="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-label="Loading overlay"
  >
    <div class="flex flex-col items-center justify-center space-y-4">
      <div class="flex items-center justify-center w-8 h-8">
        <span 
          class="material-symbols-outlined {sizeClasses[size]} {colorClasses[color]} {borderClasses} {animationClasses} transform-gpu"
          aria-hidden="true"
        >
          sync
        </span>
      </div>
      <p class="text-gray-700 font-medium" id="loading-message">{message}</p>
    </div>
  </div>
{:else}
  <div class="{containerClasses} {customClass}" role="status" aria-live="polite">
    <div class="flex flex-col items-center justify-center space-y-2">
      <div class="flex items-center justify-center w-8 h-8">
        <span 
          class="material-symbols-outlined {sizeClasses[size]} {colorClasses[color]} {borderClasses} {animationClasses} transform-gpu"
          aria-hidden="true"
        >
          sync
        </span>
      </div>
      <p class="text-gray-700 text-sm" id="loading-message">{message}</p>
    </div>
  </div>
{/if}

<style>
  /* Optional: Add a smooth transition for the pulse animation */
  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
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
  }

  /* Override Tailwind's animate-spin to ensure it works with our custom styles */
  .animate-spin {
    animation: spin 1s linear infinite;
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
