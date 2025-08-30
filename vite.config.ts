import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['jspdf', 'jspdf-autotable'],
  },
  build: {
    commonjsOptions: {
      include: [/jspdf/, /node_modules/],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['jspdf', 'jspdf-autotable'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});