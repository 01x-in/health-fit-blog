// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://example.github.io', // Placeholder, will be overridden by GitHub Actions environment if needed
  base: '/health-fit-blog', // Assuming repo name is health-fit-blog
  vite: {
    plugins: [tailwindcss()]
  }
});
