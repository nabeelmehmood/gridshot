import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from https://nabeelmehmood.github.io/gridshot/
  base: '/gridshot/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Libraries in their own files: they rarely change, so after a deploy returning players only
        // download the app code again (the service worker keeps hashed files cached).
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/, priority: 3 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler|@react-three|its-fine|zustand)[\\/]/, priority: 2 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 1 }
          ]
        }
      }
    },
    // three.js alone is ~700 kB minified (React Three Fiber pulls in the whole library), and the 3D
    // scene needs it on the first screen, so it can't be deferred. Everything else stays under 500 kB.
    chunkSizeWarningLimit: 800
  }
});
