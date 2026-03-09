import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/python-api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      }
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Optimize chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'react-vendor'
            }
            if (id.includes('three')) {
              return 'three-vendor'
            }
            if (id.includes('@tensorflow')) {
              return 'tf-vendor'
            }
            if (id.includes('leaflet')) {
              return 'map-vendor'
            }
            if (id.includes('lucide-react')) {
              return 'ui-vendor'
            }
            if (id.includes('axios') || id.includes('zustand') || id.includes('marked')) {
              return 'utils-vendor'
            }
          }
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          let extType = assetInfo.name.split('.').at(1);
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp/i.test(extType)) {
            extType = 'images';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      }
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.trace'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // Optimize asset inlining threshold
    assetsInlineLimit: 4096, // 4kb - smaller images will be inlined
    // Enable CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: false,
    // Optimize reporting
    reportCompressedSize: false,
    // Reduce build time
    target: 'esnext',
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  },
  // Configure asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.svg', '**/*.webp'],
})
