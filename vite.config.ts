/// <reference types="vite/client" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import type { IncomingMessage } from 'http';

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '');
  
  // Check if required env variables exist
  const shotstackApiKey = env.VITE_SHOTSTACK_API_KEY;
  if (!shotstackApiKey && mode === 'production') {
    throw new Error('VITE_SHOTSTACK_API_KEY is required in production');
  }

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      headers: {
        'Cross-Origin-Embedder-Policy': 'credentialless',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      proxy: {
        '/imgbb-api': {
          target: 'https://api.imgbb.com/1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/imgbb-api/, ''),
          headers: {
            'Accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err) => {
              console.error('ImgBB proxy error:', err);
            });
            
            proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => {
              console.log('ImgBB request:', req.method, req.url);
              proxyReq.setHeader('Access-Control-Allow-Origin', '*');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            });
            
            proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
              console.log('ImgBB response:', proxyRes.statusCode, req.url);
              let body = '';
              proxyRes.on('data', chunk => body += chunk);
              proxyRes.on('end', () => {
                if (proxyRes.statusCode !== 200) {
                  console.error('ImgBB error response:', body);
                }
              });
            });
          },
        },
        '/shotstack-api': {
          target: 'https://api.shotstack.io',
          changeOrigin: true,
          rewrite: (path) => {
            // Handle both regular and ingest endpoints
            if (path.includes('/ingest/')) {
              return path.replace('/shotstack-api/ingest/', '/ingest/v1/');
            }
            return path.replace('/shotstack-api/', '/v1/');
          },
          configure: (proxy, _options) => {
            proxy.on('error', (err) => {
              console.error('Shotstack proxy error:', err);
            });
            
            proxy.on('proxyReq', (proxyReq, req: IncomingMessage) => {
              console.log('Shotstack request:', req.method, req.url);
              if (shotstackApiKey) {
                proxyReq.setHeader('x-api-key', shotstackApiKey);
              }
              proxyReq.setHeader('Accept', 'application/json');
              proxyReq.setHeader('Access-Control-Allow-Origin', '*');
              proxyReq.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            });
            
            proxy.on('proxyRes', (proxyRes: IncomingMessage, req: IncomingMessage) => {
              const requestPath = req.url || '';
              console.log(`Shotstack ${requestPath.includes('/ingest/') ? 'Ingest' : 'API'} response:`, 
                proxyRes.statusCode, 
                req.url
              );
              
              let body = '';
              proxyRes.on('data', chunk => body += chunk);
              proxyRes.on('end', () => {
                if (proxyRes.statusCode !== 200) {
                  console.error('Shotstack error response:', body);
                }
              });
            });
          },
          headers: {
            'Accept': 'application/json',
            'Access-Control-Allow-Origin': '*',
          }
        }
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'supabase-vendor': ['@supabase/supabase-js'],
          },
        },
      },
    },
  };
});