import { describe, it, expect } from 'vitest'
import { MAX_CELL, MIN_CELL, cellSizeFor } from './boardLayout'

describe('fitting the board to the window', () => {
  it('leaves a small board at the normal cell size', () => {
    expect(cellSizeFor(15, 15, 1200, 900)).toBe(MAX_CELL)
  })

  it('never grows cells beyond the normal size, however much room there is', () => {
    expect(cellSizeFor(5, 5, 4000, 4000)).toBe(MAX_CELL)
  })

  it('shrinks cells when the board is wider than the space', () => {
    const size = cellSizeFor(60, 10, 900, 900)
    expect(size).toBeLessThan(MAX_CELL)
    expect(size * 60).toBeLessThanOrEqual(900)
  })

  it('shrinks for height as well as width', () => {
    const size = cellSizeFor(10, 60, 900, 600)
    expect(size).toBeLessThan(MAX_CELL)
    expect(size * 60).toBeLessThanOrEqual(600)
  })

  it('uses whichever dimension is tighter, so cells stay square', () => {
    expect(cellSizeFor(40, 10, 800, 800)).toBe(cellSizeFor(40, 1, 800, 800))
  })

  it('stops at the floor for a very large board, which then scrolls', () => {
    expect(cellSizeFor(100, 100, 900, 700)).toBe(MIN_CELL)
  })

  it('returns a whole number of pixels', () => {
    expect(Number.isInteger(cellSizeFor(37, 23, 911, 733))).toBe(true)
  })

  it('copes with a board that has no cells yet', () => {
    expect(cellSizeFor(0, 0, 900, 700)).toBe(MAX_CELL)
  })
})
