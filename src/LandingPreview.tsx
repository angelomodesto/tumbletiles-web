import { useEffect, useMemo, useState } from 'react'
import type { DemoScript } from './demo/frames'
import { buildDemoFrames } from './demo/frames'

/**
 * A small board for the landing page. Short enough that the whole loop plays
 * in a few seconds, but with walls placed so robots visibly stop against them
 * as well as against each other.
 */
const LANDING_SCRIPT: DemoScript = {
  cols: 6,
  rows: 6,
  walls: [
    { x: 2, y: 4 },
    { x: 4, y: 1 },
  ],
  robots: [
    { x: 1, y: 0 },
    { x: 3, y: 0 },
    { x: 5, y: 2 },
    { x: 2, y: 3 },
  ],
  commands: ['W', 'S'],
}

const ARROWS = [
  { direction: 'N', glyph: '↑' },
  { direction: 'W', glyph: '←' },
  { direction: 'S', glyph: '↓' },
  { direction: 'E', glyph: '→' },
] as const

/**
 * One line that stays true at every frame of the loop, so the text never
 * changes while the board is moving.
 */
const CAPTION = 'Every robot slides until a wall, an edge, or another robot stops it.'

/** How long the finished board is held before the loop starts again. */
const RESTART_PAUSE = 1800

/**
 * Plays the model on a loop: the board is built, commands are applied, and the
 * matching arrow lights up as the robots slide. The frames come from the same
 * builder the tutorial animation uses, so this cannot drift from the model.
 */
function LandingPreview() {
  const frames = useMemo(() => buildDemoFrames(LANDING_SCRIPT), [])
  const [index, setIndex] = useState(0)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  // With reduced motion the settled board is shown instead of a loop.
  const frame = reducedMotion ? frames[frames.length - 1] : frames[index]

  useEffect(() => {
    if (reducedMotion) return

    const last = index >= frames.length - 1
    const timer = setTimeout(
      () => setIndex(last ? 0 : index + 1),
      last ? RESTART_PAUSE : frames[index].hold,
    )

    return () => clearTimeout(timer)
  }, [index, frames, reducedMotion])

  const cells = LANDING_SCRIPT.cols * LANDING_SCRIPT.rows
  const robots = new Set(frame.robots)
  const walls = new Set(frame.walls)

  return (
    <section className="landing-preview" aria-label="How the model works">
      <div className="landing-preview-stage">
        <div
          className="mini-board"
          style={{
            gridTemplateColumns: `repeat(${LANDING_SCRIPT.cols}, 32px)`,
            gridTemplateRows: `repeat(${LANDING_SCRIPT.rows}, 32px)`,
          }}
          aria-hidden="true"
        >
          {Array.from({ length: cells }).map((_, cell) => (
            <div
              key={cell}
              className={
                'mini-cell' +
                (robots.has(cell) ? ' robot' : '') +
                (walls.has(cell) ? ' wall' : '')
              }
            ></div>
          ))}
        </div>

        <div className="arrow-pad mini-pad" aria-hidden="true">
          {ARROWS.map(({ direction, glyph }) => (
            <span
              key={direction}
              className={frame.direction === direction ? 'active-tool' : undefined}
            >
              {glyph}
            </span>
          ))}
        </div>
      </div>

      <p className="landing-preview-caption">{CAPTION}</p>
    </section>
  )
}

export default LandingPreview
