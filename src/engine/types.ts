/** The four commands that can be applied to the board. */
export type Direction = 'N' | 'E' | 'S' | 'W'

/** Movement offsets. y increases downward, so N is -1. */
export const DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
}

/** A cell on the board. x is the column, y is the row, and y grows downward. */
export interface Position {
  x: number
  y: number
}

/**
 * Glue labels for a tile, in N, E, S, W order. An empty string means the side
 * has no glue. Two tiles bond when the labels on the sides facing each other
 * are equal and non-empty.
 */
export type Glues = [string, string, string, string]

/** Maps a glue label to its strength. Tiles join when the total reaches the temperature. */
export type GlueFunction = Record<string, number>

/** A single square. Concrete tiles are fixed walls and never move or bond. */
export interface Tile {
  readonly id: number
  x: number
  y: number
  /** Id of the polyomino this tile belongs to. Concrete tiles use -1. */
  polyId: number
  glues: Glues
  isConcrete: boolean
}

/** A group of tiles that moves as one unit. */
export interface Polyomino {
  readonly id: number
  tiles: Tile[]
}

/**
 * The full board state. Concrete tiles are kept apart from the polyominoes so
 * they can never be moved, which matches Board.ConcreteTiles in tumbletiles.py.
 */
export interface Board {
  readonly cols: number
  readonly rows: number
  polyominoes: Polyomino[]
  concrete: Tile[]
  nextTileId: number
  nextPolyId: number
}
