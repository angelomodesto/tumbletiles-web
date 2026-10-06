import { describe, it, expect } from 'vitest'
import type { Board } from './types'
import { addConcrete, addPolyomino, addTile, createBoard } from './board'
import { step, tumble } from './step'

/**
 * Builds a board from a picture, so the tests read like the boards they check.
 * '.' is empty, '#' is a concrete wall, and 't' is a tile.
 */
function parse(picture: string): Board {
  const rows = picture.trim().split('\n').map((row) => row.trim())
  const board = createBoard(rows[0].length, rows.length)

  rows.forEach((row, y) => {
    ;[...row].forEach((cell, x) => {
      if (cell === 't') addTile(board, x, y)
      if (cell === '#') addConcrete(board, x, y)
    })
  })

  return board
}

/** Draws the board back out in the same format, for comparison. */
function render(board: Board): string {
  const grid = Array.from({ length: board.rows }, () => new Array<string>(board.cols).fill('.'))
  for (const poly of board.polyominoes) {
    for (const tile of poly.tiles) grid[tile.y][tile.x] = 't'
  }
  for (const tile of board.concrete) grid[tile.y][tile.x] = '#'
  return grid.map((row) => row.join('')).join('\n')
}

describe('tumble moves tiles to the far wall', () => {
  it('moves north', () => {
    const board = parse(`
      .....
      ..t..
      .....
    `)
    tumble(board, 'N')
    expect(render(board)).toBe(['..t..', '.....', '.....'].join('\n'))
  })

  it('moves south', () => {
    const board = parse(`
      ..t..
      .....
      .....
    `)
    tumble(board, 'S')
    expect(render(board)).toBe(['.....', '.....', '..t..'].join('\n'))
  })

  it('moves west', () => {
    const board = parse(`
      ..t..
    `)
    tumble(board, 'W')
    expect(render(board)).toBe('t....')
  })

  it('moves east', () => {
    const board = parse(`
      ..t..
    `)
    tumble(board, 'E')
    expect(render(board)).toBe('....t')
  })
})

describe('tiles are stopped by things in the way', () => {
  it('stops against a concrete wall', () => {
    const board = parse(`
      .....
      .#...
      .....
      .t...
    `)
    tumble(board, 'N')
    expect(render(board)).toBe(['.....', '.#...', '.t...', '.....'].join('\n'))
  })

  it('stacks tiles up behind the one in front', () => {
    const board = parse(`
      .....
      ..t..
      .....
      ..t..
    `)
    tumble(board, 'N')
    expect(render(board)).toBe(['..t..', '..t..', '.....', '.....'].join('\n'))
  })

  it('resolves a chain of three in a single command', () => {
    const board = parse(`
      t.t.t
    `)
    tumble(board, 'W')
    expect(render(board)).toBe('ttt..')
  })

  it('holds a chain in place when the front tile is already against the wall', () => {
    const board = parse(`
      tt..t
    `)
    tumble(board, 'W')
    expect(render(board)).toBe('ttt..')
  })
})

describe('step reports whether anything moved', () => {
  it('returns true while a tile still has room', () => {
    const board = parse(`
      .t...
    `)
    expect(step(board, 'W')).toBe(true)
  })

  it('returns false once every tile is blocked', () => {
    const board = parse(`
      t....
    `)
    expect(step(board, 'W')).toBe(false)
  })

  it('returns false when a tile is pinned against concrete', () => {
    const board = parse(`
      #t...
    `)
    expect(step(board, 'W')).toBe(false)
  })

  it('leaves an empty board alone', () => {
    const board = parse(`
      .....
    `)
    expect(step(board, 'E')).toBe(false)
  })
})

describe('matches the behavior the interface has today', () => {
  it('sends every tile to the same wall at once, stacking where columns share tiles', () => {
    const board = parse(`
      t...t
      ..t..
      t...t
    `)
    tumble(board, 'S')
    expect(render(board)).toBe(['.....', 't...t', 't.t.t'].join('\n'))
  })

  it('packs a column against a wall in order', () => {
    const board = parse(`
      ..t..
      .....
      ..t..
      .....
      ..t..
    `)
    tumble(board, 'S')
    expect(render(board)).toBe(['.....', '.....', '..t..', '..t..', '..t..'].join('\n'))
  })
})

describe('a polyomino moves as one unit', () => {
  it('keeps its shape while sliding', () => {
    const board = createBoard(4, 4)
    addPolyomino(board, [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])

    tumble(board, 'S')

    expect(render(board)).toBe(['....', '....', '.t..', '.tt.'].join('\n'))
  })

  it('is held in place when any one of its tiles is blocked', () => {
    const board = createBoard(4, 4)
    addPolyomino(board, [
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
    addConcrete(board, 2, 2)

    tumble(board, 'S')

    expect(render(board)).toBe(['....', '.tt.', '..#.', '....'].join('\n'))
  })

  it('does not fit through a gap narrower than itself', () => {
    const board = createBoard(4, 3)
    addPolyomino(board, [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ])
    addConcrete(board, 1, 1)

    tumble(board, 'E')

    expect(render(board)).toBe(['t...', 't#..', '....'].join('\n'))
  })
})

describe('tumble activates glues when it finishes', () => {
  it('fuses tiles that end up touching with matching glues', () => {
    const board = createBoard(5, 1)
    addTile(board, 0, 0, ['', 'A', '', ''])
    addTile(board, 4, 0, ['', '', '', 'A'])

    expect(board.polyominoes).toHaveLength(2)
    tumble(board, 'W')

    expect(render(board)).toBe('tt...')
    expect(board.polyominoes).toHaveLength(1)
    expect(board.polyominoes[0].tiles).toHaveLength(2)
  })

  it('leaves them separate when the glues do not match', () => {
    const board = createBoard(5, 1)
    addTile(board, 0, 0, ['', 'A', '', ''])
    addTile(board, 4, 0, ['', '', '', 'B'])

    tumble(board, 'W')

    expect(render(board)).toBe('tt...')
    expect(board.polyominoes).toHaveLength(2)
  })
})
