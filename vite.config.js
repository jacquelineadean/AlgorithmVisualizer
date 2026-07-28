import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';

// base must match the GitHub Pages sub-path this app is deployed to
export default defineConfig({
  base: '/AlgorithmVisualizer/',
  plugins: [
    // MDX compiles blog posts to components before the React plugin runs.
    { enforce: 'pre', ...mdx() },
    react(),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.js',
  },
});
