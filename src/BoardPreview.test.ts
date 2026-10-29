import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DOMParser } from '@xmldom/xmldom'
import { expect, it } from 'vitest'
import BoardPreview from './BoardPreview'
import { parseConfiguration } from './engine/xml'
import type { XmlParser } from './engine/xml'
import cat from '../public/presets/Cat.xml?raw'

it('renders actual Cat robot colors and token-based structural colors', () => {
  const config = parseConfiguration(cat, new DOMParser() as unknown as XmlParser)
  const html = renderToStaticMarkup(createElement(BoardPreview, { config, name: 'Cat' }))
  const doc = new DOMParser().parseFromString(html, 'image/svg+xml')
  const rects = [...doc.getElementsByTagName('rect')]
  expect(rects[0].getAttribute('fill')).toBe('var(--color-surface)')
  config.tiles.forEach((tile, index) => {
    expect(rects[index + 1].getAttribute('fill')).toBe(tile.isConcrete ? 'var(--color-wall)' : tile.color)
  })
  expect(new Set(config.tiles.filter((t) => !t.isConcrete).map((t) => t.color)).size).toBeGreaterThan(1)
})

it('uses type colors when defined, imported colors otherwise, and robot token as fallback', () => {
  const html = renderToStaticMarkup(createElement(BoardPreview, { name: 'Colors', config: {
    cols: 3, rows: 1, glueFunction: {}, robotTypes: [{ id: 'blue', label: 'Blue', color: '#0000ff' }],
    tiles: [
      { x: 0, y: 0, isConcrete: false, glues: ['', '', '', ''], typeId: 'blue', color: '#ff0000' },
      { x: 1, y: 0, isConcrete: false, glues: ['', '', '', ''], color: '#ff0000' },
      { x: 2, y: 0, isConcrete: false, glues: ['', '', '', ''] },
    ],
  } }))
  const doc = new DOMParser().parseFromString(html, 'image/svg+xml')
  expect([...doc.getElementsByTagName('rect')].slice(1).map((r) => r.getAttribute('fill'))).toEqual(['#0000ff', '#ff0000', 'var(--color-robot)'])
})
