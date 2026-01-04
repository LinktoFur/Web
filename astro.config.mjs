// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  output: 'static',
  vite: {
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false,
        },
        format: {
          comments: false,
        },
      },
    },
  },
});
