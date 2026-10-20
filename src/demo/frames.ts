import type { Board, Direction } from '../engine'
import { addConcrete, addTile, createBoard, step, toIndex } from '../engine'

/**
 * One rendered moment of the demo. Positions are flat cell indices so the
 * player can render them with the same grid the simulator uses.
 */
export interface Frame {
  robots: number[]
  walls: number[]
  /** The command being applied, or null while the board is being built. */
  direction: Direction | null
  /** A short caption explaining what is happening. */
  caption: string
  /** How long to hold this frame, in milliseconds. */
  hold: number
}

export interface DemoScript {
  cols: number
  rows: number
  walls: { x: number; y: number }[]
  robots: { x: number; y: number }[]
  commands: Direction[]
}

/**
 * The board the demo builds. The walls form a pocket on the left and a step in
 * the middle, so a single command shows both rules that matter: a robot stops
 * at a wall, and a robot stops behind another robot.
 */
export const DEMO_SCRIPT: DemoScript = {
  cols: 8,
  rows: 6,
  walls: [
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 5, y: 1 },
    { x: 5, y: 2 },
  ],
  robots: [
    { x: 1, y: 0 },
    { x: 3, y: 0 },
    { x: 6, y: 0 },
    { x: 7, y: 3 },
  ],
  commands: ['W', 'E', 'S'],
}

const DIRECTION_NAMES: Record<Direction, string> = {
  N: 'up',
  E: 'right',
  S: 'down',
  W: 'left',
}

/** Reads the current robot positions out of a board as cell indices. */
function robotsOf(board: Board): number[] {
  return board.polyominoes
    .flatMap((poly) => poly.tiles.map((tile) => toIndex(tile, board.cols)))
    .sort((a, b) => a - b)
}

/** Reads the wall positions out of a board as cell indices. */
function wallsOf(board: Board): number[] {
  return board.concrete.map((tile) => toIndex(tile, board.cols)).sort((a, b) => a - b)
}

/**
 * Builds every frame of the demo up front by running the real engine, so the
 * animation shows the model rather than a hand-written imitation. The player
 * only has to walk the array.
 */
export function buildDemoFrames(script: DemoScript = DEMO_SCRIPT): Frame[] {
  const board = createBoard(script.cols, script.rows)
  const frames: Frame[] = []

  frames.push({
    robots: [],
    walls: [],
    direction: null,
    caption: 'An empty board.',
    hold: 700,
  })

  // Walls appear one at a time.
  for (const wall of script.walls) {
    addConcrete(board, wall.x, wall.y)
    frames.push({
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction: null,
      caption: 'Walls stay fixed in place.',
      hold: 260,
    })
  }

  // Then robots.
  for (const robot of script.robots) {
    addTile(board, robot.x, robot.y)
    frames.push({
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction: null,
      caption: 'Robots can be moved.',
      hold: 260,
    })
  }

  frames.push({
    robots: robotsOf(board),
    walls: wallsOf(board),
    direction: null,
    caption: 'Every command moves all robots at once.',
    hold: 900,
  })

  // Each command: hold on the arrow, then one frame per step of movement.
  for (const direction of script.commands) {
    const name = DIRECTION_NAMES[direction]

    frames.push({
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction,
      caption: 'Command: ' + name + '.',
      hold: 650,
    })

    while (step(board, direction)) {
      frames.push({
        robots: robotsOf(board),
        walls: wallsOf(board),
        direction,
        caption: 'Every robot slides ' + name + '.',
        hold: 150,
      })
    }

    frames.push({
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction,
      caption: 'They stop at a wall, an edge, or another robot.',
      hold: 800,
    })
  }

  frames.push({
    robots: robotsOf(board),
    walls: wallsOf(board),
    direction: null,
    caption: 'Now try it yourself.',
    hold: 900,
  })

  return frames
}
