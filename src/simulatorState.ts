import { activateGlues, addConcrete, addConcretes, addTile, addTiles, createBoard, fromIndex, tumble } from './engine'
import type { Board, Direction, GlueFunction, Tile } from './engine'
import type { RobotType, StickingRule } from './engine/types'
import { MAX_BOARD_SIZE, configurationToBoard, serializeConfiguration } from './engine/xml'
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
  board.stickingRules = [['default', 'default']]
  board.bondingMode = 'same-type'
  return { board, glueFunction: {}, commands: 0, lastCommand: null }
}
export function loadState(config: Configuration): SimulatorState {
  const board = configurationToBoard(config)
  if (!board.robotTypes?.length) board.robotTypes = initialState().board.robotTypes
  board.bondingMode = 'same-type'
  board.stickingRules = board.robotTypes!.map((type) => [type.id, type.id])
  const state = { board, glueFunction: { ...config.glueFunction }, commands: 0, lastCommand: null }
  reassemble(state)
  return state
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
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= state.board.cols || y >= state.board.rows) return state
  if (tool === 'erase') return removeTiles(state, allTiles(state.board).filter((t) => t.x === x && t.y === y).map((t) => t.id))
  if (allTiles(state.board).some((t) => t.x === x && t.y === y)) return state
  const next = structuredClone(state)
  if (tool === 'wall') addConcrete(next.board, x, y)
  else {
    if (typeId && !next.board.robotTypes?.some((t) => t.id === typeId)) return state
    const tile = addTile(next.board, x, y)
    if (tile) tile.typeId = typeId || undefined
    activateGlues(next.board, next.glueFunction)
  }
  return next
}

export function moveSelectedTiles(state: SimulatorState, ids: number[], positions: Tile[]): SimulatorState {
  if (ids.length === 0 || positions.length === 0) return state // Stops if there are no tiles to move

  const next = structuredClone(state) // Creates a copy so the original board stays unchanged
  const selectedIds = new Set(ids) // Stores the IDs of the selected robots and walls

  
  const destinationById = new Map(
    positions.map((tile) => [tile.id, { x: tile.x, y: tile.y }]) // Connects each tile's ID to its new position
  )


  for (const tile of allTiles(next.board)) { // Goes through every robot and wall on the copied board
    if (!selectedIds.has(tile.id)) continue // Skips tiles that were not selected

    const destination = destinationById.get(tile.id) // Finds this tile's new coordinates

    if (!destination) continue // Skips the tile if no destination was provided

    tile.x = destination.x // Updates the tile's horizontal position
    tile.y = destination.y // Updates the tile's vertical position
  }

  
  reassemble(next) // Rebuilds robot assemblies after their positions change


  return next // Temporarily returns the copied board
}


export function removeTiles(state: SimulatorState, ids: number[]): SimulatorState {
  if (!allTiles(state.board).some((t) => ids.includes(t.id))) return state
  const next = structuredClone(state)
  const selected = new Set(ids)
  next.board.concrete = next.board.concrete.filter((t) => !selected.has(t.id))
  next.board.polyominoes.forEach((p) => { p.tiles = p.tiles.filter((t) => !selected.has(t.id)) })
  reassemble(next)
  return next
}
export function assignType(state: SimulatorState, ids: number[], typeId?: string): SimulatorState {
  if (typeId !== undefined && !state.board.robotTypes?.some((t) => t.id === typeId)) return state
  if (!allTiles(state.board).some((t) => !t.isConcrete && ids.includes(t.id) && t.typeId !== typeId)) return state
  const next = structuredClone(state)
  const selected = new Set(ids)
  for (const tile of allTiles(next.board)) {
    if (!tile.isConcrete && selected.has(tile.id)) { tile.typeId = typeId }
  }
  reassemble(next)
  return next
}
export function setTypes(state: SimulatorState, types: RobotType[], _rules?: StickingRule[]): SimulatorState {
  const rules: StickingRule[] = types.map((type) => [type.id, type.id])
  if (JSON.stringify(state.board.robotTypes ?? []) === JSON.stringify(types)
    && JSON.stringify(state.board.stickingRules ?? []) === JSON.stringify(rules)) return state
  const next = structuredClone(state)
  next.board.robotTypes = structuredClone(types)
  next.board.stickingRules = structuredClone(rules)
  if (JSON.stringify(state.board.stickingRules ?? []) !== JSON.stringify(rules)) reassemble(next)
  return next
}
export function resize(state: SimulatorState, cols: number, rows: number): SimulatorState {
  if (![cols, rows].every((n) => Number.isInteger(n) && n >= 1 && n <= MAX_BOARD_SIZE)) throw new Error(`Board dimensions must be between 1 and ${MAX_BOARD_SIZE}.`)
  if (cols === state.board.cols && rows === state.board.rows) return state
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


// Returns every square inside the dragged rectangle, including empty squares.
export function selectCells(
  board: Board,
  start: { x: number; y: number },
  end: { x: number; y: number }
): number[] {
  const cells: number[] = [] // Stores the selected square positions

  const minX = Math.max(0, Math.min(start.x, end.x)) // Left boundary
  const maxX = Math.min(board.cols - 1, Math.max(start.x, end.x)) // Right boundary
  const minY = Math.max(0, Math.min(start.y, end.y)) // Top boundary
  const maxY = Math.min(board.rows - 1, Math.max(start.y, end.y)) // Bottom boundary

  for (let y = minY; y <= maxY; y++) { // Goes through each row
    for (let x = minX; x <= maxX; x++) { // Goes through each column
      cells.push(y * board.cols + x) // Converts the square to its board index
    }
  }

  return cells // Returns all selected squares
}


/**
 * Fills the given board squares with robots of one type, or with walls, as a
 * single edit: one copy of the board and one glue pass, however many squares.
 * Occupied squares are skipped. Returns the same state when nothing is placed,
 * so an empty fill never becomes an undo step.
 */
export function fillCells(state: SimulatorState, cells: number[], tool: 'robot' | 'wall', typeId: string): SimulatorState {
  if (tool === 'robot' && !state.board.robotTypes?.some((t) => t.id === typeId)) return state
  const positions = cells.map((index) => fromIndex(index, state.board.cols))
  const next = structuredClone(state)
  if (tool === 'wall') return addConcretes(next.board, positions).length ? next : state
  const added = addTiles(next.board, positions)
  if (!added.length) return state
  for (const tile of added) tile.typeId = typeId
  activateGlues(next.board, next.glueFunction)
  return next
}


export function pasteTiles(
  state: SimulatorState,
  tiles: Tile[]
): SimulatorState {
  if (tiles.length === 0) return state // Stops if there is nothing to paste

  const next = structuredClone(state) // Copies the board so the original stays unchanged

  
  const robots = tiles.filter((tile) => !tile.isConcrete) // Gets only the copied robots
  const walls = tiles.filter((tile) => tile.isConcrete) // Gets only the copied walls

  
  
  const addedWalls = addConcretes(
    next.board, // Board where the copied walls will be placed
    walls.map((wall) => ({ x: wall.x, y: wall.y })) // Positions of copied walls
  )

  if (addedWalls.length !== walls.length) { // Checks that every wall was added
    throw new Error('Could not paste all walls.') // Prevents an incomplete paste from being saved
  }


  
  const addedRobots = addTiles(
    next.board, // The board we're updating
    robots.map((robot) => ({ x: robot.x, y: robot.y })) // Positions of copied robots
  )

  
  if (addedRobots.length !== robots.length) { // Checks whether every copied robot was placed
    throw new Error('Could not paste all robots.') // Prevents an incomplete paste from being saved
  }

  
  addedRobots.forEach((robot, index) => {
    const original = robots[index] // Finds the corresponding copied robot

    if (!original) return // Stops if no matching robot exists

    robot.typeId = original.typeId // Keeps the original robot type
    robot.color = original.color // Keeps the original color
    robot.label = original.label // Keeps the original label
    robot.glues = [...original.glues]
  })



  reassemble(next)
  return next
}


export function exportState(state: SimulatorState): string {
  const { board } = state
  return serializeConfiguration(board.cols, board.rows, allTiles(board).map((t) => {
    const type = board.robotTypes?.find((type) => type.id === t.typeId)
    return { ...t, cell: t.y * board.cols + t.x, color: type?.color ?? t.color,
      label: type?.label ?? t.label, assembly: t.isConcrete ? undefined : t.polyId }
  }), board.cols, state.glueFunction, board.robotTypes, board.stickingRules)
}

/** No-op edits must not evict meaningful actions from the bounded undo stack. */
export function recordHistory(history: SimulatorState[], current: SimulatorState, next: SimulatorState): SimulatorState[] {
  return next === current ? history : [...history.slice(-29), current]
}
