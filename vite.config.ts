import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dns from 'dns';
import { resolve } from 'path';

// Enable IPv4 instead of IPv6
dns.setDefaultResultOrder('ipv4first');

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.VITE_PORT || 1573),
    strictPort: true,
    hmr: {
      host: process.env.VITE_HMR_HOST || 'localhost',
      port: Number(process.env.VITE_PORT || 1573),
      protocol: 'ws',
      clientPort: Number(process.env.VITE_PORT || 1573)
    },
    watch: {
      usePolling: true
    },
    cors: true
  },
  preview: {
    host: 'localhost',
    port: Number(process.env.VITE_PORT || 1573),
    strictPort: true,
    cors: true
  }
});