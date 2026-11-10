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

## Preset configurations

The simulator ships with board configurations from the research group's
verification set, loaded from the Presets control in the simulator. They are
copied from the `Verification/` directory of
[ButterM-40/TumbleTiles](https://github.com/ButterM-40/TumbleTiles), and all
credit for them belongs to their authors. See `public/presets/NOTICE.md` for
details and for the one configuration that was left out.

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

## Simulator editing

- **Robot types:** pick a placement type, or choose **No type** for robots that
  move separately. **Add a type** creates a named, colored type; **Edit type**
  changes its label and color. Adjacent robots bond only when both have the same
  type. Different types and untyped robots never bond, even if imported side
  glues match. Walls never bond. There is no partner-rule editor.
- **Bonds:** movement keeps existing same-type assemblies rigid and activates
  new bonds after a tumble. Applying a type, deleting or moving tiles rebuilds
  assemblies. Imported configurations are rebuilt using this same-type policy,
  replacing saved cross-type or untyped assemblies. Directional glue labels and
  strengths are retained for export, but do not control this editor's bonds.
  The standalone legacy engine and tutorial retain their existing behavior.
  Appearance edits commit on blur or Enter, with one undo entry per field edit.
- **Selection:** use **Select (V)** and drag a rectangle. Shift adds to the
  selection. **Copy**, **Paste**, and **Move** operate on selected robots/walls;
  after Paste or Move, click the new group's top-left destination. **Apply type**
  uses the placement dropdown, including **No type** to separate selected robots.
  **Delete selected** removes selected pieces; **Deselect** clears the highlight.
  Escape clears selection and cancels Paste or Move. Fill and Use glues controls
  are no longer shown.
- **View:** use +/− for 50–400% zoom relative to the fitted cell size. **Pan (H)**
  or middle-button dragging scrolls the enlarged board. **Fit board** resets the
  view. Even 100 × 100 boards shrink to fit the available panel.
- **Configurations:** browse the thumbnail gallery, or import/export XML.
  Previews come from the actual bundled XML, not separate image files.
- **Resize:** enter dimensions and choose **Resize board**. Coordinates, types,
  glues, and bonded groups are retained. A shrink that would hide or discard
  pieces is rejected with a message; delete those pieces first.
- **Undo:** the last 30 simulation/edit operations can be undone, including
  clearing, resizing and loading a configuration. State is retained when moving
  between the simulator and tutorial within the page; reloads require an export.

The landing page, demonstration frames and tutorial keep their existing design.
Robot colors come from imported configurations or user-defined types; interface
chrome follows the shared visual tokens.

### XML compatibility

Legacy board size, tile positions, directional glue labels and strengths are
read and written using the existing desktop format. Export also preserves tile
labels and colors. XML text and attribute values are escaped.

`RobotTypes`, `StickingRules`, per-tile `TypeId`, and `Assembly` are web-specific
extensions. Exports include self-type rules and current rigid groups. Reopening
in this simulator applies the same-type-only policy, ignoring older partner rules. **Do not assume custom type behavior survives loading in the
original desktop application**, which may ignore or reject these extensions.
The ordinary directional-glue fields remain intact for legacy configurations.
This change does not claim independent desktop-model equivalence.

### Regression checks

Run the normal checks and the Python suite (Python 3.10+; standard library only):

```sh
npm ci
npm test
npm run test:python
npm run lint
npm run build
```

The Python tests run the actual TypeScript state transitions through a temporary
Node driver and compare every command with an independently implemented Python
movement/connectivity model: 100 seeded boards mixing typed and untyped robots,
directional glues and type rules, with 1,200 commands. They also
parse generated XML independently and check every preset's dimensions, counts,
and file size against the gallery index. `NODE` can select a Node executable.
These tests detect regressions; they do not prove the simulator is bug-free or
validate the original research experiments.
