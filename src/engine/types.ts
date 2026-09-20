/** The four commands that can be applied to the board. */
export type Direction = 'N' | 'E' | 'S' | 'W'
 
/** Movement offsets. y increases downward, so N is -1. */
export const DELTA: Record<Direction, { dx: number; dy: number }> = {
  N: { dx: 0, dy: -1 },
  E: { dx: 1, dy: 0 },
  S: { dx: 0, dy: 1 },
  W: { dx: -1, dy: 0 },
}
 