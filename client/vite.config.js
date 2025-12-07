import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// GitHub Pages base path - thay đổi theo tên repository của bạn
// Nếu repo là username.github.io thì để base: '/'
// Nếu repo là username.github.io/repo-name thì để base: '/repo-name/'
const base = process.env.NODE_ENV === 'production' 
  ? (process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/')
  : '/'

export default defineConfig({
  base: base,
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})

