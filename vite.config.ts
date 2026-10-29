import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this project from /tumbletiles-web/, not from the domain
// root, so the production build needs that prefix on every asset URL. The dev
// server still serves from /, which keeps `npm run dev` at plain localhost.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/tumbletiles-web/' : '/',
  plugins: [react()],
  test: {
    // Two projects rather than one environment. The engine is pure TypeScript
    // with no DOM, so it keeps the fast default environment; component tests
    // need jsdom. Splitting them also means a .test.tsx file can no longer be
    // written and silently collected by nothing, which is what the single
    // `src/**/*.test.ts` pattern used to do.
    projects: [
      {
        extends: true,
        test: {
          name: 'engine',
          environment: 'node',
          include: ['src/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['src/**/*.test.tsx'],
        },
      },
    ],
  },
}))
