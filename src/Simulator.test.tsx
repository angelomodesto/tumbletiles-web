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

// Read the rendered cell size so selection tests work after layout changes.
const at = (x: number, y: number) => {
  const size = parseFloat((document.querySelector('.editor-grid') as HTMLElement).style.getPropertyValue('--cell'))
  return { clientX: (x + .5) * size, clientY: (y + .5) * size }
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

  it('keeps essential selection actions and removes glue and fill controls', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    for (const name of ['Copy', 'Paste', 'Move', 'Delete selected', 'Apply type', 'Deselect']) {
      expect(screen.getByRole('button', { name })).toBeTruthy()
    }
    for (const name of ['Use glues', 'Fill with walls', 'Fill with robots']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('applies No type to split a selected pair, and Undo restores the bond', () => {
    const { container } = render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Column 1, row 1: empty' }))
    fireEvent.click(screen.getByRole('button', { name: 'Column 2, row 1: empty' }))
    const status = () => container.querySelector('.status-bar')!.textContent
    expect(status()).toContain('Groups 1')
    fireEvent.click(screen.getByRole('button', { name: 'select' }))
    drag([0, 0], [[1, 0]])
    fireEvent.change(screen.getByLabelText('Placement type'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply type' }))
    expect(status()).toContain('Groups 2')
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(status()).toContain('Groups 1')
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
