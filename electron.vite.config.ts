import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: resolve(__dirname, 'src/main/main.ts'),
        output: {
          entryFileNames: 'index.js'
        }
      }
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/core')
      }
    }
  },
  preload: {
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/core')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@core': resolve(__dirname, 'src/core')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
