import type { Board, Glues, Polyomino, Position, Tile } from './types'

/** A tile with no glue on any side. */
export const NO_GLUES: Glues = ['', '', '', '']

/** Polyomino id used for concrete tiles, which belong to no polyomino. */
export const CONCRETE_POLY_ID = -1

/** Creates an empty board. cols is the width, rows is the height. */
export function createBoard(cols: number, rows: number): Board {
  return {
    cols,
    rows,
    polyominoes: [],
    concrete: [],
    nextTileId: 0,
    nextPolyId: 0,
  }
}

/** True when the position is inside the board. */
export function inBounds(board: Board, x: number, y: number): boolean {
  return x >= 0 && x < board.cols && y >= 0 && y < board.rows
}

/** Key for position lookups. */
function keyOf(x: number, y: number): string {
  return x + ',' + y
}

/**
 * Builds a lookup from position to tile, covering both polyomino and concrete
 * tiles. This is the equivalent of coordToTile in tumbletiles.py.
 */
export function occupancy(board: Board): Map<string, Tile> {
  const map = new Map<string, Tile>()
  for (const poly of board.polyominoes) {
    for (const tile of poly.tiles) {
      map.set(keyOf(tile.x, tile.y), tile)
    }
  }
  for (const tile of board.concrete) {
    map.set(keyOf(tile.x, tile.y), tile)
  }
  return map
}

/** The tile at a position, or undefined when the cell is empty. */
export function tileAt(board: Board, x: number, y: number): Tile | undefined {
  return occupancy(board).get(keyOf(x, y))
}

/**
 * Adds a tile in a polyomino of its own. Returns undefined when the position is
 * off the board or already taken, which is how Board.Add in tumbletiles.py
 * handles a collision.
 */
export function addTile(
  board: Board,
  x: number,
  y: number,
  glues: Glues = NO_GLUES,
): Tile | undefined {
  if (!inBounds(board, x, y) || tileAt(board, x, y) !== undefined) return undefined

  const polyId = board.nextPolyId++
  const tile: Tile = {
    id: board.nextTileId++,
    x,
    y,
    polyId,
    glues: [...glues] as Glues,
    isConcrete: false,
  }
  board.polyominoes.push({ id: polyId, tiles: [tile] })
  return tile
}

/**
 * Adds several tiles as one polyomino that moves as a unit. Returns undefined,
 * and adds nothing, when any cell is off the board or already taken.
 */
export function addPolyomino(
  board: Board,
  cells: { x: number; y: number; glues?: Glues }[],
): Polyomino | undefined {
  if (cells.length === 0) return undefined

  const taken = occupancy(board)
  for (const cell of cells) {
    if (!inBounds(board, cell.x, cell.y)) return undefined
    if (taken.has(cell.x + ',' + cell.y)) return undefined
  }

  const polyId = board.nextPolyId++
  const tiles: Tile[] = cells.map((cell) => ({
    id: board.nextTileId++,
    x: cell.x,
    y: cell.y,
    polyId,
    glues: [...(cell.glues ?? NO_GLUES)] as Glues,
    isConcrete: false,
  }))

  const poly: Polyomino = { id: polyId, tiles }
  board.polyominoes.push(poly)
  return poly
}

/** Adds a fixed wall. Returns undefined when the position is off the board or taken. */
export function addConcrete(board: Board, x: number, y: number): Tile | undefined {
  if (!inBounds(board, x, y) || tileAt(board, x, y) !== undefined) return undefined

  const tile: Tile = {
    id: board.nextTileId++,
    x,
    y,
    polyId: CONCRETE_POLY_ID,
    glues: [...NO_GLUES] as Glues,
    isConcrete: true,
  }
  board.concrete.push(tile)
  return tile
}

/** Converts a position to the flat cell index the interface uses. */
export function toIndex(position: Position, cols: number): number {
  return position.y * cols + position.x
}

/** Converts a flat cell index from the interface back to a position. */
export function fromIndex(index: number, cols: number): Position {
  return { x: index % cols, y: Math.floor(index / cols) }
}
