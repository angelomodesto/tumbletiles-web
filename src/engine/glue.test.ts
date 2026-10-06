import { describe, it, expect } from 'vitest'
import type { Glues } from './types'
import { addConcrete, addPolyomino, addTile, createBoard } from './board'
import { DEFAULT_GLUE_FUNCTION, activateGlues, canJoin } from './glue'

/** Builds a glue set from the labels on each side, in N, E, S, W order. */
function glues(n = '', e = '', s = '', w = ''): Glues {
  return [n, e, s, w]
}

describe('glues decide what joins', () => {
  it('joins two tiles whose facing labels match', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 2, 1, glues('', '', '', 'A'))

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(1)
    expect(board.polyominoes[0].tiles).toHaveLength(2)
  })

  it('leaves tiles apart when the labels differ', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 2, 1, glues('', '', '', 'B'))

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(2)
  })

  it('leaves tiles apart when a side has no glue', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 2, 1)

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(2)
  })

  it('ignores tiles that are not touching', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 3, 1, glues('', '', '', 'A'))

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(2)
  })

  it('joins vertically when north meets south', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', '', 'A', ''))
    addTile(board, 1, 2, glues('A', '', '', ''))

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(1)
  })

  it('never joins to concrete', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addConcrete(board, 2, 1)

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(1)
    expect(board.polyominoes[0].tiles).toHaveLength(1)
    expect(board.concrete).toHaveLength(1)
  })
})

describe('temperature sets how much glue is needed', () => {
  it('does not join on a single bond when the temperature is 2', () => {
    const board = createBoard(5, 5)
    const a = addPolyomino(board, [{ x: 1, y: 1, glues: glues('', 'A', '', '') }])
    const b = addPolyomino(board, [{ x: 2, y: 1, glues: glues('', '', '', 'A') }])

    expect(canJoin(a!, b!, DEFAULT_GLUE_FUNCTION, 2)).toBe(false)
    expect(canJoin(a!, b!, DEFAULT_GLUE_FUNCTION, 1)).toBe(true)
  })

  it('adds up every touching pair, so two bonds reach temperature 2', () => {
    const board = createBoard(5, 5)
    const a = addPolyomino(board, [
      { x: 1, y: 1, glues: glues('', 'A', '', '') },
      { x: 1, y: 2, glues: glues('', 'A', '', '') },
    ])
    const b = addPolyomino(board, [
      { x: 2, y: 1, glues: glues('', '', '', 'A') },
      { x: 2, y: 2, glues: glues('', '', '', 'A') },
    ])

    expect(canJoin(a!, b!, DEFAULT_GLUE_FUNCTION, 2)).toBe(true)
  })
})

describe('joining keeps going until nothing else joins', () => {
  it('fuses a row of three into one polyomino', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 2, 1, glues('', 'A', '', 'A'))
    addTile(board, 3, 1, glues('', '', '', 'A'))

    activateGlues(board)

    expect(board.polyominoes).toHaveLength(1)
    expect(board.polyominoes[0].tiles).toHaveLength(3)
  })

  it('gives every tile in the merged polyomino the same id', () => {
    const board = createBoard(5, 5)
    addTile(board, 1, 1, glues('', 'A', '', ''))
    addTile(board, 2, 1, glues('', '', '', 'A'))

    activateGlues(board)

    const poly = board.polyominoes[0]
    for (const tile of poly.tiles) {
      expect(tile.polyId).toBe(poly.id)
    }
  })
})
