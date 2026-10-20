import { useEffect, useMemo, useRef, useState } from 'react'
import type { Direction } from './engine'
import { DEMO_SCRIPT, buildDemoFrames } from './demo/frames'

/** The arrows, in the order the simulator shows them. */
const ARROWS: { direction: Direction; glyph: string }[] = [
  { direction: 'N', glyph: '↑' },
  { direction: 'W', glyph: '←' },
  { direction: 'S', glyph: '↓' },
  { direction: 'E', glyph: '→' },
]

interface DemoProps {
  /** Called when the animation finishes or the viewer skips it. */
  onDone: () => void
}

/**
 * Plays the demo: the board is built, then each command is applied while the
 * matching arrow lights up. The frames come from the real engine, so what is
 * on screen is the model running, not an imitation of it.
 */
function Demo({ onDone }: DemoProps) {
  const frames = useMemo(() => buildDemoFrames(), [])
  const [index, setIndex] = useState(0)
  const onDoneRef = useRef(onDone)

  // Kept in a ref so restarting the timer does not depend on the callback's identity.
  useEffect(() => {
    onDoneRef.current = onDone
  }, [onDone])

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  useEffect(() => {
    if (index >= frames.length - 1) {
      // Hold the last frame briefly, then hand over to the tutorial.
      const done = setTimeout(() => onDoneRef.current(), 1200)
      return () => clearTimeout(done)
    }

    // With reduced motion, skip the per-step frames and only pause on the
    // frames that change what is being explained.
    const hold = reducedMotion ? Math.min(frames[index].hold, 120) : frames[index].hold
    const next = setTimeout(() => setIndex((current) => current + 1), hold)
    return () => clearTimeout(next)
  }, [index, frames, reducedMotion])

  const frame = frames[index]
  const cells = DEMO_SCRIPT.cols * DEMO_SCRIPT.rows
  const robots = new Set(frame.robots)
  const walls = new Set(frame.walls)

  return (
    <div className="demo-page">
      <h1>How Tumble Tiles works</h1>
      <p className="demo-caption">{frame.caption}</p>

      <div className="demo-stage">
        <div
          className="board-grid"
          style={{
            gridTemplateColumns: `repeat(${DEMO_SCRIPT.cols}, 30px)`,
            gridTemplateRows: `repeat(${DEMO_SCRIPT.rows}, 30px)`,
          }}
        >
          {Array.from({ length: cells }).map((_, cell) => (
            <div
              key={cell}
              className={
                'board-cell' +
                (robots.has(cell) ? ' robot' : '') +
                (walls.has(cell) ? ' wall' : '')
              }
            ></div>
          ))}
        </div>

        <div className="demo-arrows" aria-hidden="true">
          {ARROWS.map(({ direction, glyph }) => (
            <span
              key={direction}
              className={'demo-arrow' + (frame.direction === direction ? ' active-tool' : '')}
            >
              {glyph}
            </span>
          ))}
        </div>
      </div>

      <div className="demo-progress">
        <span
          className="demo-progress-bar"
          style={{ width: `${Math.round(((index + 1) / frames.length) * 100)}%` }}
        ></span>
      </div>

      <button type="button" onClick={onDone}>
        Skip →
      </button>
    </div>
  )
}

export default Demo
