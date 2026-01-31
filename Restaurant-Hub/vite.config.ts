import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(({ mode }) => {
  // تحميل متغيرات البيئة
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';
  
  // إعدادات API
  const apiTarget = env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';
  const socketTarget = env.VITE_SOCKET_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3000';
  
  return {
    // ✅ Plugins
    plugins: [
      react(),
      runtimeErrorOverlay(),
      ...(process.env.NODE_ENV !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
            import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
          ]
        : []),
    ],
    
    // ✅ Resolve paths
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    
    // ✅ Root directory
    root: path.resolve(import.meta.dirname, "client"),
    
    // ✅ Build configuration
    build: {
      outDir: path.resolve(import.meta.dirname, "dist", "public"),
      emptyOutDir: true,
      sourcemap: isDevelopment,
      minify: isProduction ? 'esbuild' : false,
      target: 'es2020',
      cssTarget: 'chrome80',
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false,
      
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, "client", "index.html"),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: ({ name }) => {
            if (/\.(gif|jpe?g|png|svg|webp|avif)$/.test(name || '')) {
              return 'assets/images/[name]-[hash][extname]';
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name || '')) {
              return 'assets/fonts/[name]-[hash][extname]';
            }
            if (/\.css$/.test(name || '')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            radix: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio', 
                   '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-collapsible',
                   '@radix-ui/react-context-menu', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
                   '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar',
                   '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress',
                   '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select',
                   '@radix-ui/react-separator', '@radix-ui/react-slider', '@radix-ui/react-slot',
                   '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast',
                   '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'],
            forms: ['react-hook-form', '@hookform/resolvers', 'zod', 'zod-validation-error'],
            charts: ['recharts'],
            animations: ['framer-motion'],
            utils: ['date-fns', 'clsx', 'tailwind-merge', 'class-variance-authority'],
          },
        },
        
        // ✅ تجاهل dependencies الباك إند
        external: [
          'express',
          'pg',
          'drizzle-orm',
          'passport',
          'express-session',
          'connect-pg-simple',
          'bcrypt',
          'cloudinary',
          'psycopg2',
          'flask',
          'socketio',
          'ws',
          'next-themes',
          'openid-client',
          'memorystore',
          'memoizee',
        ],
      },
    },
    
    // ✅ Development server
    server: isDevelopment ? {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      open: true,
      cors: true,
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'X-Requested-With, content-type, Authorization',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('🚨 Proxy error:', err.message);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('📤 Proxy request:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('📥 Proxy response:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/socket.io': {
          target: socketTarget,
          ws: true,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    } : undefined,
    
    // ✅ Preview server
    preview: {
      host: true,
      port: 4173,
      open: true,
      cors: true,
    },
    
    // ✅ Base path
    base: './',
    
    // ✅ Environment variables
    define: {
      'process.env': {},
      '__APP_ENV__': JSON.stringify(mode),
      '__VITE_API_URL__': JSON.stringify(env.VITE_API_URL),
      '__VITE_APP_NAME__': JSON.stringify(env.VITE_APP_NAME),
      '__VITE_SOCKET_URL__': JSON.stringify(env.VITE_SOCKET_URL),
    },
    
    // ✅ Optimize dependencies
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'wouter',
        'axios',
        'socket.io-client',
      ],
      exclude: [
        '@radix-ui/react-*',
        'framer-motion',
        'recharts',
      ],
      force: isDevelopment,
    },
    
    // ✅ CSS configuration
    css: {
      devSourcemap: isDevelopment,
      modules: {
        localsConvention: 'camelCase',
        generateScopedName: isProduction ? '[hash:base64:8]' : '[name]__[local]--[hash:base64:5]',
      },
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`,
        },
      },
    },
    
    // ✅ Log level
    logLevel: isProduction ? 'warn' : 'info',
    
    // ✅ Clear screen
    clearScreen: false,
  };
});
