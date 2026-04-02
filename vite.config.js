import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './packages/core/src'),
      '@ui': path.resolve(__dirname, './packages/ui/src'),
      '@styles': path.resolve(__dirname, './packages/styles/src'),
      '@assets': path.resolve(__dirname, './packages/assets/src'),
      '@config': path.resolve(__dirname, './packages/config/src'),
    },
  },
})
