import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import SiteHeader from './SiteHeader.tsx'

afterEach(cleanup)

function renderHeader(current: 'home' | 'tutorial' | 'simulator') {
  const onHome = vi.fn()
  const onTutorial = vi.fn()
  const onSimulator = vi.fn()
  render(
    <SiteHeader
      current={current}
      onHome={onHome}
      onTutorial={onTutorial}
      onSimulator={onSimulator}
    />,
  )
  return { onHome, onTutorial, onSimulator }
}

function button(name: string) {
  return screen.getByRole('button', { name })
}

describe('SiteHeader', () => {
  it('marks only the current page', () => {
    renderHeader('tutorial')
    expect(button('Tutorial').getAttribute('aria-current')).toBe('page')
    expect(button('Simulator').getAttribute('aria-current')).toBeNull()
    expect(button('Tumble Tiles').getAttribute('aria-current')).toBeNull()
  })

  it('gives the current destination the shared active-tool class', () => {
    renderHeader('simulator')
    // active-tool is used by five components, so it is the class most likely to
    // be broken by the coming per-page stylesheet split.
    expect(button('Simulator').classList.contains('active-tool')).toBe(true)
    expect(button('Tutorial').classList.contains('active-tool')).toBe(false)
  })

  it('routes each button to its own handler', () => {
    const { onHome, onTutorial, onSimulator } = renderHeader('home')
    button('Tutorial').click()
    button('Simulator').click()
    button('Tumble Tiles').click()
    expect(onTutorial).toHaveBeenCalledTimes(1)
    expect(onSimulator).toHaveBeenCalledTimes(1)
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
