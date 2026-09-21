# tumbletiles-web

A tested, browser-based simulator for the Tumble Tiles model of algorithmic
self-assembly, developed at UTRGV by Robert Schweller and Tim Wylie.

In the model, tiles sit on a grid alongside fixed walls. Each command (N, E, S
or W) applies to every tile at once: each one slides in that direction until a
wall or another tile stops it. Because the outcome of a sequence of commands is
hard to predict, results are proven on paper and then checked in a simulator.
This project is that checking tool. You supply the board and the moves, and it
shows what the model does. It does not search for move sequences.

Goals:

- Behavior that matches the published model, verified by automated tests
  against the desktop TumbleTiles application and cases from the papers
- Runs entirely in the browser as a static site, with nothing to install
- Reads and writes the `.xml` configurations exported by the desktop app
- Preset boards and scripted move sequences that reproduce the papers' examples
- Pause, resume and edit a running simulation, with pan and zoom

Built as a CSCI 4390 Senior Project at UTRGV.

## Requirements

**Node `^22.12.0 || ^24.0.0 || >=26.0.0`.** This is not advisory - on older
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
  engine/     Pure TypeScript simulation logic - no DOM, no React
  App.tsx     Root component
  main.tsx    React entry point
public/       Static assets served at the site root
```

The `engine/` directory is deliberately free of DOM and React dependencies so
the simulation can be tested in isolation. Vitest is configured with the `node`
environment for that reason; tests are picked up from `src/**/*.test.ts`. Adding
component tests later will mean introducing a `jsdom` environment.

## Tooling notes

- **Oxlint**, not ESLint, is the linter - config lives in `.oxlintrc.json`.
- TypeScript uses project references (`tsconfig.app.json` for `src/`,
  `tsconfig.node.json` for `vite.config.ts`).
