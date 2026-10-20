import type { Board, Direction } from '../engine'
import { addConcrete, addTile, createBoard, step, toIndex } from '../engine'

/**
 * One rendered moment of the demo. Positions are flat cell indices so the
 * player can render them with the same grid the simulator uses.
 */
export interface Frame {
  /**
   * Which step this frame belongs to. The player advances within a step on its
   * own and then waits, so the viewer can study each stage before moving on.
   */
  step: number
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
  rows: 8,
  walls: [
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 6, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 3, y: 7 },
  ],
  robots: [
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 5, y: 0 },
    { x: 7, y: 1 },
    { x: 1, y: 3 },
    { x: 6, y: 3 },
  ],
  commands: ['W', 'S', 'E'],
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

  // Step 0: the empty board.
  frames.push({
    step: 0,
    robots: [],
    walls: [],
    direction: null,
    caption: 'This is the board. Robots move on it; walls do not.',
    hold: 700,
  })

  // Walls appear one at a time.
  for (const wall of script.walls) {
    addConcrete(board, wall.x, wall.y)
    frames.push({
      step: 1,
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction: null,
      caption: 'Walls are placed first. They never move.',
      hold: 300,
    })
  }

  // Then robots.
  for (const robot of script.robots) {
    addTile(board, robot.x, robot.y)
    frames.push({
      step: 2,
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction: null,
      caption: 'Now the robots. There is no way to move just one of them.',
      hold: 300,
    })
  }

  // One step per command: the arrow lights up, then every robot slides.
  let stepNumber = 3

  for (const direction of script.commands) {
    const name = DIRECTION_NAMES[direction]

    frames.push({
      step: stepNumber,
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction,
      caption: 'Command: ' + name + '. Watch every robot move at once.',
      hold: 700,
    })

    while (step(board, direction)) {
      frames.push({
        step: stepNumber,
        robots: robotsOf(board),
        walls: wallsOf(board),
        direction,
        caption: 'Every robot slides ' + name + '.',
        hold: 170,
      })
    }

    frames.push({
      step: stepNumber,
      robots: robotsOf(board),
      walls: wallsOf(board),
      direction,
      caption: 'Each one stops at a wall, an edge, or another robot.',
      hold: 600,
    })

    stepNumber++
  }

  return frames
}

/** How many steps the demo has. The player uses this for its progress and buttons. */
export function countSteps(frames: Frame[]): number {
  return frames[frames.length - 1].step + 1
}
