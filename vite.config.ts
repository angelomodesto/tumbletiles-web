import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from /tumbletiles-web/, not from the domain
// root, so the production build needs that prefix on every asset URL. The dev
// server still serves from /, which keeps `npm run dev` at plain localhost.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tumbletiles-web/' : '/',
  plugins: [react()],
  test: {
    // The engine is pure TypeScript with no DOM, so the fast default
    // environment is all we need. UI tests come later.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}))
