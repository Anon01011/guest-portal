import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { Agent } from 'https'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000'

  console.log(`[vite] Proxying /api → ${apiTarget}`)

  return {
    base: './', // relative base so assets load correctly in subfolders
    plugins: [react()],
    server: {
      port: 5173,
      // Fix WebSocket HMR — always use localhost, never the remote server
      hmr: {
        host: 'localhost',
        port: 5173,
        protocol: 'ws',
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          ws: false,
          // Accept self-signed / untrusted SSL certs on the backend
          agent: apiTarget.startsWith('https')
            ? new Agent({ rejectUnauthorized: false })
            : undefined,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              console.error('[proxy] error:', err.message);
            });
            proxy.on('proxyReq', (_, req) => {
              console.log('[proxy] -->', req.method, req.url);
            });
          },
        }
      }
    }
  }
})


