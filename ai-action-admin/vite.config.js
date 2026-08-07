import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/adminapp/' : '/',
  build: {
    outDir: path.resolve(__dirname, '../ai-action-backend/adminapp'),
    emptyOutDir: true
  },
  server: {
    port: 3000,
    open: true
  }
}));
