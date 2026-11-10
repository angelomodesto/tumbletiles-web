import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Demo from './Demo'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('walkthrough captions', () => {
  it('reserves wrapped caption space without exposing future instructions', () => {
    const { container } = render(<Demo onDone={() => {}} onSkip={() => {}} />)
    const reserves = container.querySelectorAll('.demo-caption-reserve')
    expect(reserves.length).toBe(6)
    for (const reserve of reserves) expect(reserve.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getAllByRole('paragraph').map((p) => p.textContent)).toEqual([
      'This is the board. Robots move on it; walls do not.',
    ])

    const reservedText = [...reserves].map((group) => group.textContent)
    for (let step = 2; step <= 6; step++) {
      fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
      expect(screen.getByText(`Step ${step} of 6`)).toBeTruthy()
      expect([...container.querySelectorAll('.demo-caption-reserve')].map((group) => group.textContent)).toEqual(reservedText)
    }
    fireEvent.click(screen.getByRole('button', { name: '↻ Replay' }))
    expect(screen.getByText('Step 1 of 6')).toBeTruthy()
  })

  it('still reveals captions as robots animate, then clears them on Back', () => {
    vi.useFakeTimers()
    const { container } = render(<Demo onDone={() => {}} onSkip={() => {}} />)
    for (let step = 2; step <= 4; step++) fireEvent.click(screen.getByRole('button', { name: 'Next →' }))
    const current = () => container.querySelector('.demo-caption-current')!.textContent
    expect(current()).toBe('Command: left. Watch every robot move at once.')
    for (let frame = 0; frame < 20; frame++) act(() => { vi.runOnlyPendingTimers() })
    expect(current()).toContain('Every robot slides left.')
    expect(current()).toContain('Each one stops at a wall, an edge, or another robot.')
    fireEvent.click(screen.getByRole('button', { name: '← Back' }))
    expect(current()).toBe('Now the robots. There is no way to move just one of them.')
  })
})
