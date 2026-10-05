import { DELTA } from './types'
import type { Board, Direction, GlueFunction } from './types'
import { inBounds, occupancy } from './board'
import { DEFAULT_GLUE_FUNCTION, DEFAULT_TEMPERATURE, activateGlues } from './glue'

/**
 * Moves every polyomino one cell in the given direction, skipping any that are
 * blocked. Returns true when at least one polyomino moved.
 *
 * This follows Board.Step in tumbletiles.py: a polyomino is blocked if any of
 * its tiles would leave the board, or would run into a concrete tile or into a
 * polyomino that is itself blocked. Blocking is resolved to a fixed point
 * first, so a whole chain of touching polyominoes is held in place by whatever
 * stops the one at the front.
 */
export function step(board: Board, direction: Direction): boolean {
  const { dx, dy } = DELTA[direction]
  const tiles = occupancy(board)
  const blocked = new Set<number>()

  let marked = true
  while (marked) {
    marked = false

    for (const poly of board.polyominoes) {
      if (blocked.has(poly.id)) continue

      for (const tile of poly.tiles) {
        const nx = tile.x + dx
        const ny = tile.y + dy

        if (!inBounds(board, nx, ny)) {
          blocked.add(poly.id)
          marked = true
          break
        }

        const neighbor = tiles.get(nx + ',' + ny)
        if (
          neighbor !== undefined &&
          neighbor.polyId !== poly.id &&
          (neighbor.isConcrete || blocked.has(neighbor.polyId))
        ) {
          blocked.add(poly.id)
          marked = true
          break
        }
      }
    }
  }

  let moved = false
  for (const poly of board.polyominoes) {
    if (blocked.has(poly.id)) continue
    for (const tile of poly.tiles) {
      tile.x += dx
      tile.y += dy
    }
    moved = true
  }

  return moved
}

/** Settings for a command. The defaults match tumbletiles.py. */
export interface TumbleOptions {
  glueFunction?: GlueFunction
  temperature?: number
  /**
   * Activate glues after every step instead of once at the end. This is the
   * TumbleGlue variant in the reference, and it can bond tiles that only touch
   * while passing each other.
   */
  glueEachStep?: boolean
}

/**
 * Applies a command: steps repeatedly until nothing can move, then activates
 * glues, which is what one key press does. Mirrors Board.Tumble.
 */
export function tumble(
  board: Board,
  direction: Direction,
  options: TumbleOptions = {},
): void {
  const glueFunction = options.glueFunction ?? DEFAULT_GLUE_FUNCTION
  const temperature = options.temperature ?? DEFAULT_TEMPERATURE

  if (options.glueEachStep === true) {
    activateGlues(board, glueFunction, temperature)
    while (step(board, direction)) {
      activateGlues(board, glueFunction, temperature)
    }
    return
  }

  while (step(board, direction)) {
    // keep stepping until every polyomino is blocked
  }
  activateGlues(board, glueFunction, temperature)
}
