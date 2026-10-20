import { describe, it, expect } from 'vitest'
import { addConcrete, addTile, createBoard, toIndex, tumble } from '../engine'
import { DEMO_SCRIPT, buildDemoFrames, countSteps } from './frames'

const frames = buildDemoFrames()

/** Runs the same script straight through the engine, for comparison. */
function expectedFinalRobots(): number[] {
  const board = createBoard(DEMO_SCRIPT.cols, DEMO_SCRIPT.rows)
  for (const wall of DEMO_SCRIPT.walls) addConcrete(board, wall.x, wall.y)
  for (const robot of DEMO_SCRIPT.robots) addTile(board, robot.x, robot.y)
  for (const direction of DEMO_SCRIPT.commands) tumble(board, direction)

  return board.polyominoes
    .flatMap((poly) => poly.tiles.map((tile) => toIndex(tile, board.cols)))
    .sort((a, b) => a - b)
}

describe('the demo is built from the real engine', () => {
  it('ends where tumble would put the robots', () => {
    expect(frames[frames.length - 1].robots).toEqual(expectedFinalRobots())
  })

  it('never loses or gains a robot once they are all placed', () => {
    const placed = frames.filter((frame) => frame.robots.length > 0)
    const final = placed[placed.length - 1]
    expect(final.robots).toHaveLength(DEMO_SCRIPT.robots.length)
  })

  it('never puts two robots in the same cell', () => {
    for (const frame of frames) {
      expect(new Set(frame.robots).size).toBe(frame.robots.length)
    }
  })

  it('never moves a robot onto a wall', () => {
    for (const frame of frames) {
      const walls = new Set(frame.walls)
      for (const robot of frame.robots) expect(walls.has(robot)).toBe(false)
    }
  })

  it('keeps every robot on the board', () => {
    const cells = DEMO_SCRIPT.cols * DEMO_SCRIPT.rows
    for (const frame of frames) {
      for (const robot of frame.robots) {
        expect(robot).toBeGreaterThanOrEqual(0)
        expect(robot).toBeLessThan(cells)
      }
    }
  })
})

describe('the animation reads as a sequence', () => {
  it('builds the board before issuing any command', () => {
    const firstCommand = frames.findIndex((frame) => frame.direction !== null)
    const wallsAtThatPoint = frames[firstCommand - 1].walls
    expect(wallsAtThatPoint).toHaveLength(DEMO_SCRIPT.walls.length)
  })

  it('highlights an arrow for every command in the script', () => {
    const highlighted = [...new Set(frames.map((f) => f.direction).filter(Boolean))]
    expect(highlighted.sort()).toEqual([...DEMO_SCRIPT.commands].sort())
  })

  it('highlights the arrow on every frame where robots are moving', () => {
    for (let i = 1; i < frames.length; i++) {
      const moved =
        frames[i].robots.length === frames[i - 1].robots.length &&
        frames[i].robots.join() !== frames[i - 1].robots.join()
      if (moved) expect(frames[i].direction).not.toBeNull()
    }
  })

  it('gives every frame a caption and a positive hold', () => {
    for (const frame of frames) {
      expect(frame.caption.length).toBeGreaterThan(0)
      expect(frame.hold).toBeGreaterThan(0)
    }
  })

  it('actually animates, rather than jumping to the end', () => {
    expect(frames.length).toBeGreaterThan(15)
  })
})

describe('the demo board teaches both stopping rules', () => {
  const cols = DEMO_SCRIPT.cols
  const final = frames[frames.length - 1]

  /** Neighbours of a cell, without wrapping around a row edge. */
  function neighbours(cell: number): number[] {
    const x = cell % cols
    const out = [cell - cols, cell + cols]
    if (x > 0) out.push(cell - 1)
    if (x < cols - 1) out.push(cell + 1)
    return out
  }

  it('ends with at least one robot stopped against a wall', () => {
    const walls = new Set(final.walls)
    const touching = final.robots.some((robot) =>
      neighbours(robot).some((cell) => walls.has(cell)),
    )
    expect(touching).toBe(true)
  })

  it('ends with at least one robot stopped against another robot', () => {
    const robots = new Set(final.robots)
    const touching = final.robots.some((robot) =>
      neighbours(robot).some((cell) => robots.has(cell)),
    )
    expect(touching).toBe(true)
  })
})

describe('frames are grouped into steps the viewer advances through', () => {
  it('numbers every frame and never goes backwards', () => {
    for (let i = 1; i < frames.length; i++) {
      expect(frames[i].step).toBeGreaterThanOrEqual(frames[i - 1].step)
    }
  })

  it('starts at step 0 and counts one step per stage', () => {
    expect(frames[0].step).toBe(0)
    // empty board, walls, robots, then one per command
    expect(countSteps(frames)).toBe(3 + DEMO_SCRIPT.commands.length)
  })

  it('shows the board being built before any command', () => {
    const buildSteps = frames.filter((frame) => frame.step <= 2)
    for (const frame of buildSteps) expect(frame.direction).toBeNull()
  })

  it('gives each command its own step, highlighted throughout', () => {
    DEMO_SCRIPT.commands.forEach((direction, i) => {
      const stepFrames = frames.filter((frame) => frame.step === 3 + i)
      expect(stepFrames.length).toBeGreaterThan(1)
      for (const frame of stepFrames) expect(frame.direction).toBe(direction)
    })
  })

  it('leaves each command step on a settled board, not mid-slide', () => {
    // The last frame of a command's step must equal the first frame of the next
    // step, so pausing there shows a finished move.
    for (let i = 0; i < DEMO_SCRIPT.commands.length - 1; i++) {
      const thisStep = frames.filter((frame) => frame.step === 3 + i)
      const nextStep = frames.filter((frame) => frame.step === 4 + i)
      expect(thisStep[thisStep.length - 1].robots).toEqual(nextStep[0].robots)
    }
  })

  it('has every step reachable by its number', () => {
    for (let step = 0; step < countSteps(frames); step++) {
      expect(frames.some((frame) => frame.step === step)).toBe(true)
    }
  })
})
