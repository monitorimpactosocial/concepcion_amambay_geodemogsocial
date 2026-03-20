import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/concepcion_amambay_geodemogsocial/',
  server: {
    host: true,
    port: 5173
  }
});
