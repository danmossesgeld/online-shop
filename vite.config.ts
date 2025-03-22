import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['svelte-navigator'], // Exclude this from pre-bundling
	  },
	resolve: {
		alias: {
			'$routes': fileURLToPath(new URL('./src/routes', import.meta.url))
		}
	}
});


