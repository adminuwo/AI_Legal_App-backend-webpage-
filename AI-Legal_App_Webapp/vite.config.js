// AISA Frontend - Vite Configuration (Sync: 2026-04-30)
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envPrefix: ["AISA_", "VITE_"],
  server: {
    host: true, // Listen on all network interfaces
    allowedHosts: true, // Allow ngrok URLs to bypass host checks in Vite 6
  },
  esbuild: {
    pure: ['console.log', 'console.debug']
  },
  build: {
    outDir: "dist",
    reportCompressedSize: true,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom') || id.includes('recoil') || id.includes('zustand')) {
              return 'vendor';
            }
            if (id.includes('three') || id.includes('@react-three')) {
              return 'vendor-three';
            }
            if (id.includes('@splinetool')) {
              return 'vendor-spline';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('docx-preview') || id.includes('jszip')) {
              return 'vendor-docutils';
            }
            if (id.includes('xlsx')) {
              return 'vendor-xlsx';
            }
            return 'vendor';
          }
        }
      }
    }
  }
})
