import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// The BuildQ backend lives inside the BRG Prime service. Point this at wherever
// that server is running locally.
const API_TARGET = process.env.BUILDQ_API_TARGET || 'http://localhost:4000'

// BuildQ is served under a sub-path of the BRG Prime site, so built assets must
// be requested from /boq/ rather than /. The router reads this same value via
// import.meta.env.BASE_URL. Override with BUILDQ_BASE=/ to serve at the root.
const BASE = process.env.BUILDQ_BASE || '/boq/'

// https://vite.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Proxying /api makes the app and the API same-origin in development.
    // That matters for more than convenience: the refresh token is an httpOnly
    // cookie, and a cross-site cookie needs SameSite=None + Secure, which is
    // impossible over plain http. Same-origin in dev keeps the token out of
    // localStorage where any XSS could read it.
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
})
