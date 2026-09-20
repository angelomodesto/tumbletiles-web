# tumbletiles-web

A web-based simulator for the Tumble Tiles model, where tiles on a grid are
driven by directional commands.

> **TODO:** Replace the description above with the real project summary.

## Requirements

**Node `^22.12.0 || ^24.0.0 || >=26.0.0`.** This is not advisory — on older
versions npm *silently skips* the platform-native `@rolldown/*` and `@oxlint/*`
binaries (they are optional dependencies gated on `engines`), and the test run
then fails with a misleading "Cannot find module `@rolldown/binding-wasm32-wasi`".

If you use nvm, the version is pinned in `.nvmrc`:

```bash
nvm use
```

## Setup

```bash
npm install
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run typecheck` | `tsc -b --noEmit` across both project refs |
| `npm run lint` | Oxlint |
| `npm run build` | Typecheck, then production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |

## Layout

```
src/
  engine/     Pure TypeScript simulation logic — no DOM, no React
  App.tsx     Root component
  main.tsx    React entry point
public/       Static assets served at the site root
```

The `engine/` directory is deliberately free of DOM and React dependencies so
the simulation can be tested in isolation. Vitest is configured with the `node`
environment for that reason; tests are picked up from `src/**/*.test.ts`. Adding
component tests later will mean introducing a `jsdom` environment.

## Tooling notes

- **Oxlint**, not ESLint, is the linter — config lives in `.oxlintrc.json`.
- TypeScript uses project references (`tsconfig.app.json` for `src/`,
  `tsconfig.node.json` for `vite.config.ts`).
