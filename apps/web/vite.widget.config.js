import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Build as a library (IIFE) so it loads via <script> on arbitrary pages
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/widget/WidgetApp.jsx'), // widget entry
      name: 'WorkfloWidgetApp',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        // keep small global name
        entryFileNames: 'workflo-widget-app.iife.js',
        // Bundle everything for simplicity
      },
    },
    // shrink the bundle as much as possible
    minify: 'esbuild',
    sourcemap: false,
    target: 'es2019',
    outDir: 'dist/widget',
  },
});
