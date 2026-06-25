import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    ...(mode === 'development' ? [inspectAttr()] : []),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@geveze/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
    },
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts')) return 'vendor-recharts';
          if (id.includes('@dnd-kit')) return 'vendor-dnd';
          if (id.includes('@radix-ui')) return 'vendor-radix';
          if (id.includes('date-fns')) return 'vendor-date-fns';
          if (id.includes('react-dom') || id.includes('/react/')) return 'vendor-react';
        },
      },
    },
  },
}));
