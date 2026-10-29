import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import Simulator from './Simulator.tsx'
import { initialState } from './simulatorState'

// jsdom has no layout, so the board's ResizeObserver needs a stand-in.
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})

afterEach(cleanup)

function Harness() {
  const [state, setState] = useState(initialState)
  return <Simulator state={state} setState={setState} />
}

describe('Simulator errors', () => {
  it('render below the board, so showing one never moves it', () => {
    const { container } = render(<Harness />)
    const label = screen.getByLabelText('New type label')
    // "Robot" is the default type's label, so adding it again is refused.
    fireEvent.change(label, { target: { value: 'Robot' } })
    fireEvent.submit(label.closest('form')!)

    const error = screen.getByRole('alert')
    const board = container.querySelector('.editor-board-panel')!
    expect(error.textContent).toBe('Choose a different type label.')
    expect(board.compareDocumentPosition(error) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
