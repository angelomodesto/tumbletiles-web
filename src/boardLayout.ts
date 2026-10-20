/** Cell size the board uses when there is plenty of room. */
export const MAX_CELL = 30

/**
 * Smallest cell we will shrink to. Below this a cell is too small to click, so
 * the board scrolls inside its panel instead of shrinking further.
 */
export const MIN_CELL = 8

/**
 * Largest whole-pixel square cell that lets a cols x rows board fit the space
 * available, clamped between MIN_CELL and MAX_CELL.
 *
 * A board that fits keeps today's 30px cells, a larger board shrinks to fit,
 * and a very large board stops at MIN_CELL and is scrolled instead.
 */
export function cellSizeFor(
  cols: number,
  rows: number,
  availableWidth: number,
  availableHeight: number,
): number {
  if (cols <= 0 || rows <= 0) return MAX_CELL

  const byWidth = Math.floor(availableWidth / cols)
  const byHeight = Math.floor(availableHeight / rows)
  const fits = Math.min(byWidth, byHeight)

  if (!Number.isFinite(fits)) return MAX_CELL
  return Math.max(MIN_CELL, Math.min(MAX_CELL, fits))
}
