// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
// Deploying to Cloudflare Pages
export default defineConfig({
  site: 'https://lilbittools.pages.dev',
  output: 'server',
  vite: {
    plugins: [tailwindcss()],
  },
  adapter: cloudflare(),
});
