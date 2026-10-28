import { activateGlues, addConcrete, addTile, createBoard, tumble } from './engine'
import type { Board, Direction, GlueFunction, Tile } from './engine'
import type { RobotType, StickingRule } from './engine/types'
import { configurationToBoard, serializeConfiguration } from './engine/xml'
import type { Configuration } from './engine/xml'

export interface SimulatorState {
  board: Board
  glueFunction: GlueFunction
  commands: number
  lastCommand: Direction | null
}

export const allTiles = (board: Board): Tile[] => [...board.concrete, ...board.polyominoes.flatMap((p) => p.tiles)]
export function initialState(): SimulatorState {
  const board = createBoard(15, 15)
  board.robotTypes = [{ id: 'default', label: 'Robot', color: '#111318' }]
  board.stickingRules = []
  return { board, glueFunction: {}, commands: 0, lastCommand: null }
}
export function loadState(config: Configuration): SimulatorState {
  const board = configurationToBoard(config)
  if (!board.robotTypes?.length) board.robotTypes = initialState().board.robotTypes
  return { board, glueFunction: { ...config.glueFunction }, commands: 0, lastCommand: null }
}
export function moveState(state: SimulatorState, direction: Direction): SimulatorState {
  const next = structuredClone(state)
  tumble(next.board, direction, { glueFunction: next.glueFunction })
  next.commands++
  next.lastCommand = direction
  return next
}

/** Editing changes the construction: recompute connected assemblies from its current contacts. */
function reassemble(state: SimulatorState): void {
  state.board.polyominoes = state.board.polyominoes.flatMap((p) => p.tiles).map((tile) => {
    const id = state.board.nextPolyId++
    tile.polyId = id
    return { id, tiles: [tile] }
  })
  activateGlues(state.board, state.glueFunction)
}
export function place(state: SimulatorState, x: number, y: number, tool: 'robot' | 'wall' | 'erase', typeId: string): SimulatorState {
  const next = structuredClone(state)
  if (tool === 'erase') return removeTiles(state, allTiles(state.board).filter((t) => t.x === x && t.y === y).map((t) => t.id))
  if (tool === 'wall') addConcrete(next.board, x, y)
  else {
    if (!next.board.robotTypes?.some((t) => t.id === typeId)) return state
    const tile = addTile(next.board, x, y)
    if (tile) tile.typeId = typeId
    activateGlues(next.board, next.glueFunction)
  }
  return next
}
export function removeTiles(state: SimulatorState, ids: number[]): SimulatorState {
  const next = structuredClone(state)
  const selected = new Set(ids)
  next.board.concrete = next.board.concrete.filter((t) => !selected.has(t.id))
  next.board.polyominoes.forEach((p) => { p.tiles = p.tiles.filter((t) => !selected.has(t.id)) })
  reassemble(next)
  return next
}
export function assignType(state: SimulatorState, ids: number[], typeId: string): SimulatorState {
  if (!state.board.robotTypes?.some((t) => t.id === typeId)) return state
  const next = structuredClone(state)
  const selected = new Set(ids)
  for (const tile of allTiles(next.board)) {
    if (!tile.isConcrete && selected.has(tile.id)) { tile.typeId = typeId; tile.glues = ['', '', '', ''] }
  }
  reassemble(next)
  return next
}
export function setTypes(state: SimulatorState, types: RobotType[], rules: StickingRule[]): SimulatorState {
  const next = structuredClone(state)
  next.board.robotTypes = structuredClone(types)
  next.board.stickingRules = structuredClone(rules)
  if (JSON.stringify(state.board.stickingRules ?? []) !== JSON.stringify(rules)) reassemble(next)
  return next
}
export function resize(state: SimulatorState, cols: number, rows: number): SimulatorState {
  if (![cols, rows].every((n) => Number.isInteger(n) && n >= 1 && n <= 100)) throw new Error('Board dimensions must be between 1 and 100.')
  if (allTiles(state.board).some((t) => t.x >= cols || t.y >= rows)) {
    throw new Error('Remove the tiles outside the new dimensions before shrinking. Your board has been kept intact.')
  }
  const next = structuredClone(state)
  next.board = { ...next.board, cols, rows }
  return next
}
export function selectRegion(board: Board, start: { x: number; y: number }, end: { x: number; y: number }): number[] {
  return allTiles(board).filter((t) => t.x >= Math.min(start.x, end.x) && t.x <= Math.max(start.x, end.x)
    && t.y >= Math.min(start.y, end.y) && t.y <= Math.max(start.y, end.y)).map((t) => t.id)
}
export function exportState(state: SimulatorState): string {
  const { board } = state
  return serializeConfiguration(board.cols, board.rows, allTiles(board).map((t) => {
    const type = board.robotTypes?.find((type) => type.id === t.typeId)
    return { ...t, cell: t.y * board.cols + t.x, color: type?.color ?? t.color,
      label: type?.label ?? t.label, assembly: t.isConcrete ? undefined : t.polyId }
  }), board.cols, state.glueFunction, board.robotTypes, board.stickingRules)
}
