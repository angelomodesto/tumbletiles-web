import { describe, it, expect } from 'vitest'
import { DELTA } from './types'

describe('direction deltas', () => {
  it('treats N as decreasing y', () => {
    expect(DELTA.N).toEqual({ dx: 0, dy: -1 })
  })
  it('treats E as increasing x', () => {
    expect(DELTA.E).toEqual({ dx: 1, dy: 0 })
  })
})