import { describe, expect, it } from 'vitest'
import { DOMParser } from '@xmldom/xmldom'
import type { XmlParser } from './engine/xml'
import { MAX_BOARD_SIZE, parseConfiguration } from './engine/xml'
import { addConcrete, addTile, activateGlues } from './engine'
import { allTiles, assignType, exportState, fillCells, initialState, loadState, moveSelectedTiles, moveState, pasteTiles, place, recordHistory, removeTiles, resize, selectCells, selectRegion, setTypes } from './simulatorState'
const parser = new DOMParser() as unknown as XmlParser
const types = [
  { id: 'blue', label: 'Blue & <one> "robot"', color: '#0066ff' },
  { id: 'red', label: 'Red', color: '#ff3300' },
  { id: 'green', label: 'Green', color: '#008800' },
]
function typed() { return setTypes(initialState(), types, [['blue', 'red']]) }

describe('persistent simulator state', () => {
  it('keeps a bonded pair rigid across repeated commands when only one tile is blocked', () => {
    let state = initialState()
    addTile(state.board, 1, 1, ['', 'A', '', ''])!.typeId = 'default'
    addTile(state.board, 2, 1, ['', '', '', 'A'])!.typeId = 'default'
    addConcrete(state.board, 1, 3)
    activateGlues(state.board)
    state = moveState(state, 'S')
    expect(state.board.polyominoes).toHaveLength(1)
    expect(state.board.polyominoes[0].tiles.map((t) => [t.x, t.y])).toEqual([[1, 2], [2, 2]])
    state = moveState(state, 'N')
    expect(state.board.polyominoes[0].tiles.map((t) => t.y)).toEqual([0, 0])
    expect(state.commands).toBe(2)
  })
  it('resizes without changing positions, identity, glues or assemblies', () => {
    let state = initialState()
    addTile(state.board, 2, 2, ['A', 'B', 'C', 'D'])
    const before = structuredClone(allTiles(state.board))
    state = resize(state, 20, 20)
    expect(allTiles(state.board)).toEqual(before)
    expect(allTiles(resize(state, 5, 5).board)).toEqual(before)
    expect(() => resize(state, 2, 2)).toThrow(/kept intact/)
    expect(allTiles(state.board)).toEqual(before)
  })
  it('does not mutate undo snapshots', () => {
    const state = place(initialState(), 0, 0, 'robot', 'default')
    moveState(state, 'S')
    expect(allTiles(state.board)[0].y).toBe(0)
  })
})
describe('robot type rules', () => {
  it('ignores legacy glues for untyped or mixed pairs on import and after movement', () => {
    for (const typeId of [undefined, 'default']) {
      const source = initialState()
      addTile(source.board, 1, 1, ['', 'A', '', ''])!.typeId = typeId
      addTile(source.board, 2, 1, ['', '', '', 'A'])
      const imported = loadState(parseConfiguration(exportState(source), parser))
      expect(imported.board.polyominoes).toHaveLength(2)
      expect(moveState(imported, 'S').board.polyominoes).toHaveLength(2)
    }
  })
  it('bonds only matching types, ignoring imported cross-type rules', () => {
    for (const [left, right, count] of [['blue', 'red', 2], ['red', 'blue', 2], ['blue', 'blue', 1], ['blue', 'green', 2]] as const) {
      let state = place(typed(), 1, 1, 'robot', left)
      state = place(state, 2, 1, 'robot', right)
      expect(state.board.polyominoes).toHaveLength(count)
    }
  })
  it('supports self sticking and untyped separation, ignores diagonals and walls', () => {
    let state = setTypes(typed(), types, [['blue', 'blue']])
    state = place(place(state, 0, 0, 'robot', 'blue'), 1, 1, 'robot', 'blue')
    expect(state.board.polyominoes).toHaveLength(2)
    state = place(state, 1, 0, 'robot', 'blue')
    expect(state.board.polyominoes).toHaveLength(1)
    state = assignType(state, allTiles(state.board).map((tile) => tile.id))
    expect(state.board.polyominoes).toHaveLength(3)
    state = place(state, 2, 0, 'wall', 'blue')
    expect(state.board.concrete).toHaveLength(1)
    expect(state.board.polyominoes).toHaveLength(3)
  })
  it('splits an assembly when its connecting tile is deleted', () => {
    let state = setTypes(typed(), types, [['blue', 'blue']])
    for (let x = 0; x < 3; x++) state = place(state, x, 0, 'robot', 'blue')
    expect(state.board.polyominoes).toHaveLength(1)
    state = removeTiles(state, [1])
    expect(state.board.polyominoes).toHaveLength(2)
  })
  it('selects a rectangle in either direction and applies types only to robots', () => {
    let state = place(place(typed(), 1, 1, 'robot', 'blue'), 2, 2, 'wall', 'blue')
    const ids = selectRegion(state.board, { x: 3, y: 3 }, { x: 0, y: 0 })
    expect(ids).toHaveLength(2)
    state = assignType(state, ids, 'red')
    expect(state.board.concrete[0].typeId).toBeUndefined()
    expect(state.board.polyominoes[0].tiles[0].typeId).toBe('red')
  })
})
describe('XML round trips', () => {
  it('preserves glue strengths including zero and escapes labels', () => {
    const state = initialState()
    state.glueFunction = { 'A&<"': 0, strong: 3 }
    addTile(state.board, 0, 0, ['A&<"', 'strong', '', ''])
    const restored = loadState(parseConfiguration(exportState(state), parser))
    expect(restored.glueFunction).toEqual(state.glueFunction)
    expect(restored.board.polyominoes[0].tiles[0].glues).toEqual(['A&<"', 'strong', '', ''])
  })
  it('preserves typed assemblies, colors and rules, then moves identically', () => {
    let state = place(place(typed(), 1, 1, 'robot', 'blue'), 2, 1, 'robot', 'blue')
    state = place(state, 1, 3, 'wall', 'blue')
    const restored = loadState(parseConfiguration(exportState(state), parser))
    expect(restored.board.robotTypes).toEqual(types)
    expect(restored.board.stickingRules).toEqual(types.map((type) => [type.id, type.id]))
    expect(restored.board.polyominoes).toHaveLength(1)
    const positions = (s: typeof state) => allTiles(s.board).map((t) => [t.x, t.y]).sort()
    expect(positions(moveState(restored, 'S'))).toEqual(positions(moveState(state, 'S')))
  })
})

describe('metadata-only edits', () => {
  it('renaming and recoloring a type leaves saved assemblies intact', () => {
    let state = place(place(typed(), 0, 0, 'robot', 'blue'), 1, 0, 'robot', 'blue')
    const ids = state.board.polyominoes.map((p) => p.id)
    state = setTypes(state, types.map((t) => ({ ...t, label: t.label + ' renamed', color: '#123456' })), [['blue', 'red']])
    expect(state.board.polyominoes.map((p) => p.id)).toEqual(ids)
    expect(state.board.polyominoes[0].tiles).toHaveLength(2)
  })
  it('rejects unknown type references without silently dropping behavior', () => {
    const xml = exportState(place(typed(), 0, 0, 'robot', 'blue')).replace('<TypeId>blue</TypeId>', '<TypeId>missing</TypeId>')
    expect(() => parseConfiguration(xml, parser)).toThrow(/unknown type/)
  })
})

describe('review regressions: retain imported glues', () => {
  it('keeps Cat glue labels through assignment and export, while untyped robots stay separate', async () => {
    const { default: cat } = await import('../public/presets/Cat.xml?raw')
    const original = loadState(parseConfiguration(cat, parser))
    const ids = allTiles(original.board).map((t) => t.id)
    const glues = (s: typeof original) => allTiles(s.board).map((t) => [t.x, t.y, t.glues]).sort()
    const typed = assignType(original, ids, 'default')
    expect(glues(typed)).toEqual(glues(original))
    const saved = loadState(parseConfiguration(exportState(typed), parser))
    expect(glues(saved)).toEqual(glues(original))
    const restored = assignType(saved, allTiles(saved.board).map((t) => t.id))
    expect(restored.board.polyominoes.map((p) => p.tiles.length).sort()).toEqual(original.board.polyominoes.map((p) => p.tiles.length).sort())
    const positions = (s: typeof original) => allTiles(s.board).map((t) => [t.x, t.y]).sort()
    expect(positions(moveState(restored, 'S'))).toEqual(positions(moveState(original, 'S')))
    expect(allTiles(original.board).every((t) => t.typeId === undefined)).toBe(true)
  })
})

describe('review regressions: meaningful undo entries', () => {
  it('returns the same state for occupied cells, empty erases, unchanged sizes and metadata', () => {
    const state = place(initialState(), 1, 1, 'robot', 'default')
    expect(place(state, 1, 1, 'robot', 'default')).toBe(state)
    expect(place(state, 1, 1, 'wall', 'default')).toBe(state)
    expect(place(state, 0, 0, 'erase', 'default')).toBe(state)
    expect(removeTiles(state, [999])).toBe(state)
    expect(assignType(state, [0], 'default')).toBe(state)
    expect(assignType(state, [], 'default')).toBe(state)
    expect(resize(state, state.board.cols, state.board.rows)).toBe(state)
    expect(setTypes(state, state.board.robotTypes!, state.board.stickingRules!)).toBe(state)
  })
  it('keeps the real action available after more than 30 no-op clicks', () => {
    const before = initialState()
    const placed = place(before, 0, 0, 'robot', 'default')
    let history = recordHistory([], before, placed)
    for (let i = 0; i < 40; i++) history = recordHistory(history, placed, place(placed, 0, 0, 'wall', 'default'))
    expect(history).toEqual([before])
    expect(recordHistory(history, placed, placed)).toBe(history)
  })
  it('uses the shared import cap for resizing, including the boundary', () => {
    expect(resize(initialState(), MAX_BOARD_SIZE, MAX_BOARD_SIZE).board.cols).toBe(MAX_BOARD_SIZE)
    expect(() => resize(initialState(), MAX_BOARD_SIZE + 1, 1)).toThrow(/dimensions/)
  })
})

describe('filling selected squares', () => {
  const shape = (state: ReturnType<typeof initialState>) => ({
    walls: state.board.concrete.map((t) => [t.x, t.y]).sort(),
    groups: state.board.polyominoes.map((p) => p.tiles.map((t) => [t.x, t.y, t.typeId]).sort()).sort(),
  })

  it('builds exactly the board that placing square by square would', () => {
    let start = setTypes(initialState(), types, [['blue', 'blue']])
    start = place(place(start, 2, 2, 'wall', 'blue'), 0, 0, 'robot', 'red')
    const cells = selectCells(start.board, { x: 0, y: 0 }, { x: 4, y: 3 })
    for (const tool of ['robot', 'wall'] as const) {
      const oneByOne = cells.reduce((s, i) => place(s, i % s.board.cols, Math.floor(i / s.board.cols), tool, 'blue'), start)
      expect(shape(fillCells(start, cells, tool, 'blue'))).toEqual(shape(oneByOne))
    }
  })

  it('returns the same state when nothing can be placed, so undo gains no step', () => {
    const start = place(initialState(), 0, 0, 'wall', 'default')
    expect(fillCells(start, [0], 'robot', 'default')).toBe(start)
    expect(fillCells(start, [], 'wall', 'default')).toBe(start)
    expect(fillCells(start, [5], 'robot', 'missing-type')).toBe(start)
  })

  it('clamps a dragged rectangle to the board', () => {
    const state = resize(initialState(), 3, 3)
    expect(selectCells(state.board, { x: -4, y: -4 }, { x: 9, y: 1 })).toEqual([0, 1, 2, 3, 4, 5])
  })
})

describe('copy, paste and move', () => {
  // Two robots of the same type start bonded; glue labels remain saved.
  function gluedPair() {
    const state = initialState()
    state.glueFunction = { A: 1 }
    addTile(state.board, 1, 1, ['', 'A', '', ''])!.typeId = 'default'
    addTile(state.board, 2, 1, ['', '', '', 'A'])!.typeId = 'default'
    activateGlues(state.board, state.glueFunction)
    return state
  }
  const shifted = (state: ReturnType<typeof initialState>, dx: number, dy: number) =>
    allTiles(state.board).map((t) => ({ ...t, x: t.x + dx, y: t.y + dy }))

  it('pastes robots with their glue labels, and bonds matching types straight away', () => {
    const start = gluedPair()
    const after = pasteTiles(start, shifted(start, 0, 5))
    const pasted = allTiles(after.board).filter((t) => t.y === 6)
    expect(pasted.map((t) => t.glues)).toEqual([['', 'A', '', ''], ['', '', '', 'A']])
    expect(new Set(pasted.map((t) => t.polyId)).size).toBe(1)
  })

  it('keeps type, colour and label on pasted robots', () => {
    const start = place(setTypes(initialState(), types, []), 0, 0, 'robot', 'blue')
    const pasted = allTiles(pasteTiles(start, shifted(start, 3, 3)).board).find((t) => t.x === 3 && t.y === 3)
    expect(pasted?.typeId).toBe('blue')
  })

  it('refuses a paste onto an occupied square and changes nothing', () => {
    const start = gluedPair()
    expect(() => pasteTiles(start, shifted(start, 1, 0))).toThrow(/Cannot paste here/)
    expect(allTiles(start.board)).toHaveLength(2)
  })

  it('refuses a move onto a piece that is not moving, or off the board', () => {
    let start = gluedPair()
    start = place(start, 5, 1, 'wall', 'default')
    const ids = start.board.polyominoes.flatMap((p) => p.tiles.map((t) => t.id))
    expect(() => moveSelectedTiles(start, ids, shifted(start, 3, 0).filter((t) => ids.includes(t.id)))).toThrow(/Cannot move here/)
    expect(() => moveSelectedTiles(start, ids, shifted(start, -5, 0).filter((t) => ids.includes(t.id)))).toThrow(/Cannot move here/)
  })

  it('moves a group, keeps it bonded, and returns the same state for a move to where it already is', () => {
    const start = gluedPair()
    const ids = allTiles(start.board).map((t) => t.id)
    expect(moveSelectedTiles(start, ids, allTiles(start.board))).toBe(start)
    const moved = moveSelectedTiles(start, ids, shifted(start, 4, 6))
    expect(allTiles(moved.board).map((t) => [t.x, t.y])).toEqual([[5, 7], [6, 7]])
    expect(moved.board.polyominoes).toHaveLength(1)
  })
})
