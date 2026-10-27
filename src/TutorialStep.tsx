import type { ReactNode } from 'react'

export const TUTORIAL_STEPS = 6

interface TutorialStepProps {
  step: number
  title: string
  /** One short, active sentence saying what to do. */
  instruction: string
  /** The board, arrows, or whatever this step asks the viewer to use. */
  children?: ReactNode
  /** Whether the step's task has been completed. */
  done: boolean
  /** Shown once the task is done. */
  successText?: string
  /** Shown when an attempted action could not be carried out. */
  hint?: string
  onBack?: () => void
  onNext?: () => void
  onSkip?: () => void
  nextLabel?: string
  /** Replaces Back and Next on the final step. */
  footer?: ReactNode
}

/**
 * The frame every tutorial step shares: progress, one instruction, the thing
 * to interact with, a line of feedback, and the controls. Keeping it in one
 * place means a step cannot quietly drift from the others.
 */
function TutorialStep({
  step,
  title,
  instruction,
  children,
  done,
  successText,
  hint,
  onBack,
  onNext,
  onSkip,
  nextLabel = 'Next →',
  footer,
}: TutorialStepProps) {
  return (
    <div className={'tutorial-step' + (children === undefined ? '' : ' tutorial-step-board')}>
      <div className="step-meter">
        <span className="step-count">
          Step {step} of {TUTORIAL_STEPS}
        </span>
        <span className="step-progress">
          <span
            className="step-progress-bar"
            style={{ width: `${Math.round((step / TUTORIAL_STEPS) * 100)}%` }}
          ></span>
        </span>
      </div>

      <h2>{title}</h2>

      <p className="tutorial-instruction">{instruction}</p>

      {children}

      {/*
        * Height is reserved so feedback appearing never moves the board. A
        * hint wins over the success line: it describes what just happened,
        * and a completed step would otherwise swallow the explanation.
        */}
      <p className="tutorial-feedback" role="status">
        {hint !== undefined && hint !== '' ? (
          hint
        ) : done && successText !== undefined ? (
          <span className="tutorial-success">✓ {successText}</span>
        ) : null}
      </p>

      {footer ?? (
        <div className="tutorial-nav">
          <button type="button" onClick={onBack}>
            ← Back
          </button>

          <button
            type="button"
            className="tutorial-button"
            disabled={!done}
            onClick={onNext}
          >
            {nextLabel}
          </button>

          {onSkip !== undefined && (
            <button type="button" className="tutorial-skip" onClick={onSkip}>
              Skip to Simulator
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default TutorialStep
