import type { Config } from 'tailwindcss';

export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],

	theme: {
		extend: {}
	},

	plugins: [require("daisyui")],
	
	daisyui: {
		themes: [
			{
				light: {
					...require("daisyui/src/theming/themes")["light"],
					"primary": "#FF6B00",
					"primary-content": "#ffffff",
					"base-100": "#ffffff",
					"base-content": "#1f2937",
				}
			},
			"dark", "cupcake", "bumblebee", "emerald", "corporate", "synthwave", "retro", "cyberpunk", "valentine", "halloween", "garden", "forest", "aqua", "lofi", "pastel", "fantasy", "wireframe", "black", "luxury", "dracula", "cmyk", "autumn", "business", "acid", "lemonade", "night", "coffee", "winter"
		],
		base: true,
		styled: true,
		utils: true,
		logs: true,
		themeRoot: ":root",
	},
} satisfies Config;
