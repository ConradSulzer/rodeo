import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, 'src/core')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: { reporter: ['text', 'html'], reportsDirectory: 'coverage' }
  }
})
