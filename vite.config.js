import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Served from https://nabeelmehmood.github.io/gridshot/
  base: '/gridshot/',
  plugins: [react()]
});
