import { describe, it, expect } from 'vitest'
import {
  addConcrete,
  addConcretes,
  addTile,
  addTiles,
  createBoard,
  fromIndex,
  inBounds,
  tileAt,
  toIndex,
} from './board'

describe('board setup', () => {
  it('starts empty', () => {
    const board = createBoard(5, 4)
    expect(board.cols).toBe(5)
    expect(board.rows).toBe(4)
    expect(board.polyominoes).toHaveLength(0)
    expect(board.concrete).toHaveLength(0)
  })

  it('puts each new tile in its own polyomino', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1)
    addTile(board, 3, 3)
    expect(board.polyominoes).toHaveLength(2)
    expect(board.polyominoes[0].tiles).toHaveLength(1)
  })

  it('keeps concrete out of the polyomino list so it can never move', () => {
    const board = createBoard(5, 5)
    addConcrete(board, 2, 2)
    expect(board.concrete).toHaveLength(1)
    expect(board.polyominoes).toHaveLength(0)
  })

  it('refuses a position that is already taken', () => {
    const board = createBoard(5, 5)
    expect(addTile(board, 2, 2)).toBeDefined()
    expect(addTile(board, 2, 2)).toBeUndefined()
    expect(addConcrete(board, 2, 2)).toBeUndefined()
  })

  it('refuses a position off the board', () => {
    const board = createBoard(5, 5)
    expect(addTile(board, -1, 0)).toBeUndefined()
    expect(addTile(board, 0, 5)).toBeUndefined()
  })

  it('finds a tile by position', () => {
    const board = createBoard(5, 5)
    const tile = addTile(board, 4, 1)
    expect(tileAt(board, 4, 1)).toBe(tile)
    expect(tileAt(board, 0, 0)).toBeUndefined()
  })

  it('knows what is inside the board', () => {
    const board = createBoard(3, 2)
    expect(inBounds(board, 2, 1)).toBe(true)
    expect(inBounds(board, 3, 1)).toBe(false)
    expect(inBounds(board, 0, -1)).toBe(false)
  })
})

describe('flat index conversion used by the interface', () => {
  it('converts a position to an index', () => {
    expect(toIndex({ x: 0, y: 0 }, 15)).toBe(0)
    expect(toIndex({ x: 3, y: 2 }, 15)).toBe(33)
  })

  it('converts an index back to a position', () => {
    expect(fromIndex(0, 15)).toEqual({ x: 0, y: 0 })
    expect(fromIndex(33, 15)).toEqual({ x: 3, y: 2 })
  })

  it('round trips every cell of a board', () => {
    const cols = 7
    for (let index = 0; index < cols * 4; index++) {
      expect(toIndex(fromIndex(index, cols), cols)).toBe(index)
    }
  })
})

describe('batch placement', () => {
  it('adds one robot per free square, each in its own polyomino', () => {
    const board = createBoard(4, 4)
    addConcrete(board, 1, 0)
    const added = addTiles(board, [
      { x: 0, y: 0 },
      { x: 1, y: 0 }, // a wall is already here
      { x: 0, y: 0 }, // listed twice
      { x: 9, y: 9 }, // off the board
      { x: 2, y: 0 },
    ])
    expect(added.map((t) => [t.x, t.y])).toEqual([[0, 0], [2, 0]])
    expect(board.polyominoes).toHaveLength(2)
    expect(new Set(added.map((t) => t.polyId)).size).toBe(2)
    expect(tileAt(board, 1, 0)?.isConcrete).toBe(true)
  })

  it('adds walls the same way and returns nothing when every square is taken', () => {
    const board = createBoard(3, 3)
    addTile(board, 0, 0)
    expect(addConcretes(board, [{ x: 0, y: 0 }, { x: 1, y: 1 }]).map((t) => [t.x, t.y])).toEqual([[1, 1]])
    expect(addConcretes(board, [{ x: 0, y: 0 }, { x: 1, y: 1 }])).toEqual([])
    expect(board.concrete).toHaveLength(1)
  })
})
