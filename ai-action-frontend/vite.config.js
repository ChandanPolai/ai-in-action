import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Same pattern as adminapp — URLs stay under /userapp/...
  base: mode === 'production' ? '/userapp/' : '/',
  build: {
    outDir: path.resolve(__dirname, '../ai-action-backend/userapp'),
    emptyOutDir: true
  },
  server: {
    port: 3001,
    open: true
  }
}));
