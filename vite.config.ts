import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // The engine is pure TypeScript with no DOM, so the fast default
    // environment is all we need. UI tests come later.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})