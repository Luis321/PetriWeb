import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/PetriWeb/',          // ← nombre exacto de tu repo
  build: { outDir: 'dist' },
});
