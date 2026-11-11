import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// While building on this computer, /api requests go to the local test API
// (started with `npm run serve:local` in the backend folder).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5001/demo-rally/europe-west1/api',
    },
  },
});
