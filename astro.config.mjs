// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
// Deploying to Cloudflare Pages
export default defineConfig({
  site: 'https://example.com',
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
