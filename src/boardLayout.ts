/** Cell size the board uses when there is plenty of room. */
export const MAX_CELL = 30

/**
 * Largest square cell that fits the available space, capped at MAX_CELL.
 *
 * Prefer whole pixels, but allow subpixel cells in exceptionally small panels.
 * Fit has no minimum cell size; zooming in makes small cells easier to edit.
 */
export function cellSizeFor(
  cols: number,
  rows: number,
  availableWidth: number,
  availableHeight: number,
): number {
  if (cols <= 0 || rows <= 0) return MAX_CELL

  const byWidth = availableWidth / cols
  const byHeight = availableHeight / rows
  const fits = Math.min(byWidth, byHeight)

  if (!Number.isFinite(fits)) return MAX_CELL
  const size = Math.max(0, Math.min(MAX_CELL, fits))
  return size >= 1 ? Math.floor(size) : size
}
