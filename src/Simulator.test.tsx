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
  // Drag selection uses pointer events and pointer capture, which jsdom may lack.
  globalThis.PointerEvent ??= class extends MouseEvent {
    pointerId: number
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
    }
  } as unknown as typeof PointerEvent
  Element.prototype.setPointerCapture ??= () => {}
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

// With no layout in jsdom the board sits at 0,0. The cell size is read from the
// --cell value the board sets, so these points follow any change to the sizing.
const at = (x: number, y: number) => {
  const size = parseFloat(screen.getByRole('group', { name: 'Simulation board' }).style.getPropertyValue('--cell'))
  return { clientX: (x + 0.5) * size, clientY: (y + 0.5) * size }
}

function drag(from: [number, number], to: [number, number][], shiftKey = false) {
  const board = screen.getByRole('group', { name: 'Simulation board' })
  fireEvent.pointerDown(board, { button: 0, pointerId: 1, shiftKey, ...at(...from) })
  for (const point of to) fireEvent.pointerMove(board, { pointerId: 1, shiftKey, ...at(...point) })
  fireEvent.pointerUp(board, { pointerId: 1 })
}

const count = (selector: string) => document.querySelectorAll('.editor-grid ' + selector).length

describe('Simulator square selection', () => {
  it('switching to the robot tool only switches tools, it does not fill', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[2, 1]])
    expect(count('.selected-cell')).toBe(6)
    fireEvent.click(screen.getByRole('button', { name: 'robot' }))
    expect(count('.board-cell.robot')).toBe(0)
    expect(count('.selected-cell')).toBe(0)
  })

  it('fills the empty squares from the explicit button, as one undo step', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[2, 1]])
    fireEvent.click(screen.getByRole('button', { name: 'Fill with walls' }))
    expect(count('.board-cell.wall')).toBe(6)
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(count('.board-cell.wall')).toBe(0)
  })

  it('clears highlighted squares from the keyboard as well as the buttons', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[1, 1]])
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(count('.selected-cell')).toBe(0)
    drag([0, 0], [[1, 1]])
    fireEvent.keyDown(window, { key: 'r' })
    expect(screen.getByRole('button', { name: 'robot' }).getAttribute('aria-pressed')).toBe('true')
    expect(count('.selected-cell')).toBe(0)
  })

  it('lets a shift-drag shrink back instead of keeping every square it passed over', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[2, 2]]) // 9 squares
    drag([5, 5], [[8, 8], [5, 5]], true) // out to 16 squares, then back to 1
    expect(count('.selected-cell')).toBe(10)
  })
})

describe('Simulator copy, paste and move', () => {
  const cell = (x: number, y: number, what: string) => screen.getByRole('button', { name: `Column ${x + 1}, row ${y + 1}: ${what}` })
  const hover = (x: number, y: number) => fireEvent.pointerMove(screen.getByRole('group', { name: 'Simulation board' }), { pointerId: 1, ...at(x, y) })

  it('copies with Ctrl+C, previews the paste under the pointer, and pastes on click', () => {
    render(<Harness />)
    fireEvent.click(cell(0, 0, 'empty'))
    fireEvent.click(cell(1, 0, 'empty'))
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[1, 0]])
    fireEvent.keyDown(window, { key: 'c', ctrlKey: true })
    fireEvent.keyDown(window, { key: 'v', ctrlKey: true })
    hover(5, 5)
    expect(count('.preview-cell')).toBe(2)
    expect(count('.preview-blocked')).toBe(0)
    fireEvent.click(cell(5, 5, 'empty'))
    expect(count('.board-cell.robot')).toBe(4)
    expect(count('.preview-cell')).toBe(0)
  })

  it('marks the preview as blocked over an occupied square', () => {
    render(<Harness />)
    fireEvent.click(cell(0, 0, 'empty'))
    fireEvent.click(cell(3, 3, 'empty'))
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[0, 0]])
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    fireEvent.click(screen.getByRole('button', { name: 'Paste' }))
    hover(3, 3)
    expect(count('.preview-blocked')).toBe(1)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(count('.preview-cell')).toBe(0)
  })

  it('moves the pieces from where a tilt left them, not where they were picked up', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'wall' }))
    fireEvent.click(cell(0, 2, 'empty'))
    fireEvent.click(screen.getByRole('button', { name: 'robot' }))
    fireEvent.click(cell(2, 2, 'empty'))
    fireEvent.click(cell(4, 2, 'empty'))
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([2, 2], [[4, 2]])
    fireEvent.click(screen.getByRole('button', { name: 'Move' }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' }) // robots slide to x = 1 and x = 2, now one apart
    fireEvent.click(cell(5, 5, 'empty'))
    expect(cell(5, 5, 'Robot')).toBeTruthy()
    expect(cell(6, 5, 'Robot')).toBeTruthy()
    expect(count('.board-cell.robot')).toBe(2)
  })
})
