import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      '8396bb01-cac5-4c48-9ca3-c5946e5bc473-00-2jyt3rr493xxd.picard.replit.dev',
    ],
  },
});