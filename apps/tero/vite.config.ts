import tailwindcss from '@tailwindcss/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    dedupe: ['react', 'react-dom'],
  },
  ssr: { external: ['react', 'react-dom'] },
  // Tauri serves index.html directly; TanStack Start otherwise emits _shell.html.
  plugins: [
    tailwindcss(),
    tanstackStart({ spa: { enabled: true, prerender: { outputPath: '/index.html' } } }),
    react(),
  ],
});
