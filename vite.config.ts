import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    allowedHosts: [
      'bd4f48b8-7de9-4e10-8662-e2c69b3dca71-00-y5qdnt94g5jt.picard.replit.dev', // 👈 your current Replit URL
    ],
  },
});