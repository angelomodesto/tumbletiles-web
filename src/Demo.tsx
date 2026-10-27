import { useEffect, useMemo, useState } from 'react'
import type { Direction } from './engine'
import { DEMO_SCRIPT, buildDemoFrames, countSteps } from './demo/frames'

/** The arrows, laid out as a cross like the simulator's movement controls. */
const ARROWS: { direction: Direction; glyph: string; label: string }[] = [
  { direction: 'N', glyph: '↑', label: 'up' },
  { direction: 'W', glyph: '←', label: 'left' },
  { direction: 'S', glyph: '↓', label: 'down' },
  { direction: 'E', glyph: '→', label: 'right' },
]

interface DemoProps {
  /** Called when the viewer chooses to continue, or skips. */
  onDone: () => void
  /** Called when the viewer wants to go straight to the simulator. */
  onSkip: () => void
}

/**
 * Walks through the model one step at a time. Within a step the robots slide by
 * themselves so the movement is visible, then it waits for the viewer. The
 * frames come from the real engine, so this is the model running rather than an
 * imitation of it.
 */
function Demo({ onDone, onSkip }: DemoProps) {
  const frames = useMemo(() => buildDemoFrames(), [])
  const stepCount = useMemo(() => countSteps(frames), [frames])
  const [index, setIndex] = useState(0)

  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true

  const currentStep = frames[index].step
  const lastOfStep = frames.findLastIndex((f) => f.step === currentStep)

  // With reduced motion the step's finished state is shown straight away rather
  // than animated, so this is derived during render instead of being stepped.
  const frame = reducedMotion ? frames[lastOfStep] : frames[index]
  const atStepEnd = reducedMotion || index >= lastOfStep
  const isFinalStep = currentStep >= stepCount - 1

  // Play through the current step, then hold until the viewer advances.
  useEffect(() => {
    if (atStepEnd) return
    const timer = setTimeout(() => setIndex((current) => current + 1), frames[index].hold)
    return () => clearTimeout(timer)
  }, [index, atStepEnd, frames])

  /** Jumps to the first frame of a step. */
  const goToStep = (step: number) => {
    const target = frames.findIndex((f) => f.step === step)
    if (target >= 0) setIndex(target)
  }

  // Every caption shown so far in this step, in order and without repeats, so
  // a line stays on screen instead of being replaced before it can be read.
  const shown = frames.slice(0, (reducedMotion ? lastOfStep : index) + 1)
  const captions = shown
    .filter((f) => f.step === currentStep)
    .map((f) => f.caption)
    .filter((caption, i, all) => all.indexOf(caption) === i)

  const cells = DEMO_SCRIPT.cols * DEMO_SCRIPT.rows
  const robots = new Set(frame.robots)
  const walls = new Set(frame.walls)

  return (
    <div className="demo-page">
      <h1>How Tumble Tiles works</h1>
      <div className="demo-caption">
        {captions.map((caption) => (
          <p key={caption}>{caption}</p>
        ))}
      </div>

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

        <div className="arrow-pad">
          {ARROWS.map(({ direction, glyph, label }) => {
            const active = frame.direction === direction
            return (
              <span
                key={direction}
                className={active ? 'active-tool' : undefined}
                aria-label={active ? 'applying ' + label : undefined}
              >
                {glyph}
              </span>
            )
          })}
        </div>
      </div>

      <div className="step-meter">
        <span className="step-count">
          Step {currentStep + 1} of {stepCount}
        </span>
        <span className="step-progress">
          <span
            className="step-progress-bar"
            style={{ width: `${Math.round(((currentStep + 1) / stepCount) * 100)}%` }}
          ></span>
        </span>
      </div>

      <div className="demo-controls">
        <button type="button" disabled={currentStep === 0} onClick={() => goToStep(currentStep - 1)}>
          ← Back
        </button>

        {isFinalStep ? (
          <>
            <button type="button" onClick={() => goToStep(0)}>
              ↻ Replay
            </button>
            <button type="button" className="tutorial-button" onClick={onDone}>
              Continue →
            </button>
          </>
        ) : (
          <button
            type="button"
            className="tutorial-button"
            onClick={() => goToStep(currentStep + 1)}
          >
            Next →
          </button>
        )}

        <button type="button" onClick={onSkip}>
          Skip to Simulator
        </button>
      </div>

    </div>
  )
}

export default Demo
