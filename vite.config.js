import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Vendors estables en chunks propios: el hash no cambia entre deploys
        // salvo que se actualice la dependencia → mejor caché del navegador.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'vendor-react';
          if (id.includes('node_modules/recharts')) return 'vendor-charts';
          if (/node_modules\/(gsap|@gsap)\//.test(id)) return 'vendor-gsap';
        },
      },
    },
  },
  server: {
    allowedHosts: ['clm.grivyzom.com', '144.217.10.38'],
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:12001',
        changeOrigin: true,
      },
    },
  },
})
