import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ── GitHub Pages deployment ────────────────────────────────────────────────────
// Set VITE_BASE_PATH in your environment or change the string below to match
// your repository name.  For a user/org site (username.github.io) use '/'.
//
//   Example: repo is github.com/username/hpetrisim → base = '/hpetrisim/'
//   Example: repo is github.com/username/username.github.io → base = '/'
//
const base = process.env.VITE_BASE_PATH || '/hpetrisim/';

export default defineConfig({
  plugins: [react()],
  base,
  build: {
    outDir:       'dist',
    sourcemap:    false,
    rollupOptions: {
      output: {
        manualChunks: { react: ['react', 'react-dom'] },
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
