import type { Board, GlueFunction, Polyomino, Tile } from './types'
import { occupancy } from './board'

/** Index of each side within a tile's glue labels. */
const N = 0
const E = 1
const S = 2
const W = 3

/** Strengths used by tumbletiles.py, where every known label is worth 1. */
export const DEFAULT_GLUE_FUNCTION: GlueFunction = {
  N: 1, E: 1, S: 1, W: 1,
  A: 1, B: 1, C: 1, D: 1,
  X: 1, Y: 1, Z: 1,
}

/** Temperature used by tumbletiles.py: tiles join once strength reaches 1. */
export const DEFAULT_TEMPERATURE = 1

/**
 * Strength of the bond between two touching tiles, or 0 when they do not touch
 * or their facing labels differ. A label the glue function does not list is
 * worth 1; the reference throws on an unknown label and swallows the error,
 * which silently drops the bond.
 */
function bondStrength(a: Tile, b: Tile, glueFunction: GlueFunction): number {
  if (a.isConcrete || b.isConcrete) return 0

  let mine = ''
  let theirs = ''

  if (b.x - a.x === 1 && a.y === b.y) {
    mine = a.glues[E]
    theirs = b.glues[W]
  } else if (a.x - b.x === 1 && a.y === b.y) {
    mine = a.glues[W]
    theirs = b.glues[E]
  } else if (b.y - a.y === 1 && a.x === b.x) {
    mine = a.glues[S]
    theirs = b.glues[N]
  } else if (a.y - b.y === 1 && a.x === b.x) {
    mine = a.glues[N]
    theirs = b.glues[S]
  } else {
    return 0
  }

  if (mine === '' || mine !== theirs) return 0
  return glueFunction[mine] ?? 1
}

/**
 * Whether two polyominoes bond strongly enough to become one. Every touching
 * pair of tiles contributes, and the total is compared against the temperature,
 * as in Polyomino.CanJoin.
 */
export function canJoin(
  a: Polyomino,
  b: Polyomino,
  glueFunction: GlueFunction = DEFAULT_GLUE_FUNCTION,
  temperature: number = DEFAULT_TEMPERATURE,
): boolean {
  if (a.id === b.id) return false

  let strength = 0
  for (const tile of a.tiles) {
    for (const other of b.tiles) {
      strength += bondStrength(tile, other, glueFunction)
    }
  }

  return strength >= temperature
}

/** Merges b into a and removes b from the board. */
export function join(board: Board, a: Polyomino, b: Polyomino): void {
  if (a.id === b.id) return

  for (const tile of b.tiles) {
    tile.polyId = a.id
    a.tiles.push(tile)
  }
  board.polyominoes = board.polyominoes.filter((poly) => poly.id !== b.id)
}

/**
 * Joins every pair of touching polyominoes whose glues are strong enough, and
 * keeps going until nothing else joins, since a merge can create new contacts.
 * Mirrors Board.ActivateGlues.
 */
export function activateGlues(
  board: Board,
  glueFunction: GlueFunction = DEFAULT_GLUE_FUNCTION,
  temperature: number = DEFAULT_TEMPERATURE,
): void {
  let changed = true

  while (changed) {
    changed = false
    const tiles = occupancy(board)

    for (const poly of board.polyominoes) {
      for (const tile of poly.tiles) {
        const neighbors = [
          tiles.get(tile.x + 1 + ',' + tile.y),
          tiles.get(tile.x - 1 + ',' + tile.y),
          tiles.get(tile.x + ',' + (tile.y + 1)),
          tiles.get(tile.x + ',' + (tile.y - 1)),
        ]

        for (const neighbor of neighbors) {
          if (neighbor === undefined || neighbor.polyId === poly.id) continue

          const other = board.polyominoes.find((p) => p.id === neighbor.polyId)
          if (other === undefined) continue

          if (canJoin(poly, other, glueFunction, temperature)) {
            join(board, poly, other)
            changed = true
            break
          }
        }

        if (changed) break
      }

      if (changed) break
    }
  }
}
