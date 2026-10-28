import { describe, expect, it } from 'vitest'
import { DOMParser } from '@xmldom/xmldom'
import type { XmlParser } from './engine/xml'
import { parseConfiguration } from './engine/xml'
import { addConcrete, addTile, activateGlues } from './engine'
import { allTiles, assignType, exportState, initialState, loadState, moveState, place, removeTiles, resize, selectRegion, setTypes } from './simulatorState'
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
    addTile(state.board, 1, 1, ['', 'A', '', ''])
    addTile(state.board, 2, 1, ['', '', '', 'A'])
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
  it('bonds blue to red in either order, without implicitly bonding blue to blue', () => {
    for (const [left, right, count] of [['blue', 'red', 1], ['red', 'blue', 1], ['blue', 'blue', 2], ['blue', 'green', 2]] as const) {
      let state = place(typed(), 1, 1, 'robot', left)
      state = place(state, 2, 1, 'robot', right)
      expect(state.board.polyominoes).toHaveLength(count)
    }
  })
  it('supports self sticking and no sticking, ignores diagonals and walls', () => {
    let state = setTypes(typed(), types, [['blue', 'blue']])
    state = place(place(state, 0, 0, 'robot', 'blue'), 1, 1, 'robot', 'blue')
    expect(state.board.polyominoes).toHaveLength(2)
    state = place(state, 1, 0, 'robot', 'blue')
    expect(state.board.polyominoes).toHaveLength(1)
    state = setTypes(state, types, [])
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
    let state = place(place(typed(), 1, 1, 'robot', 'blue'), 2, 1, 'robot', 'red')
    state = place(state, 1, 3, 'wall', 'blue')
    const restored = loadState(parseConfiguration(exportState(state), parser))
    expect(restored.board.robotTypes).toEqual(types)
    expect(restored.board.stickingRules).toEqual([['blue', 'red']])
    expect(restored.board.polyominoes).toHaveLength(1)
    const positions = (s: typeof state) => allTiles(s.board).map((t) => [t.x, t.y]).sort()
    expect(positions(moveState(restored, 'S'))).toEqual(positions(moveState(state, 'S')))
  })
})

describe('metadata-only edits', () => {
  it('renaming and recoloring a type leaves saved assemblies intact', () => {
    let state = place(place(typed(), 0, 0, 'robot', 'blue'), 1, 0, 'robot', 'red')
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
