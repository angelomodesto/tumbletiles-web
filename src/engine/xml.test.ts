import { describe, it, expect } from 'vitest'
import { DOMParser } from '@xmldom/xmldom'
import type { XmlParser } from './xml'
import {
  ConfigurationError,
  configurationToBoard,
  parseConfiguration,
  robotCells,
  serializeConfiguration,
  wallCells,
} from './xml'
import { tumble } from './step'
// Loaded through Vite so the test does not need node's file system.
import cat from '../../public/presets/Cat.xml?raw'

/** The node test environment has no DOMParser, so one is supplied. */
const parser = new DOMParser() as unknown as XmlParser

function board(xml: string) {
  return configurationToBoard(parseConfiguration(xml, parser))
}

const SMALL = `<TileConfiguration>
  <BoardSize height="5" width="5" />
  <GlueFunction>
    <Function><Labels L1="N" /><Strength>1</Strength></Function>
  </GlueFunction>
  <TileData>
    <Tile><Location x="1" y="1" /><NorthGlue>0</NorthGlue><SouthGlue>0</SouthGlue><EastGlue>N</EastGlue><WestGlue>0</WestGlue><Concrete>False</Concrete></Tile>
    <Tile><Location x="2" y="1" /><NorthGlue>0</NorthGlue><SouthGlue>0</SouthGlue><EastGlue>0</EastGlue><WestGlue>N</WestGlue><Concrete>False</Concrete></Tile>
    <Tile><Location x="4" y="4" /><NorthGlue>0</NorthGlue><SouthGlue>0</SouthGlue><EastGlue>0</EastGlue><WestGlue>0</WestGlue><Concrete>True</Concrete></Tile>
  </TileData>
</TileConfiguration>`

describe('reading a configuration', () => {
  it('reads the board size', () => {
    const config = parseConfiguration(SMALL, parser)
    expect(config.cols).toBe(5)
    expect(config.rows).toBe(5)
  })

  it('reads the glue function', () => {
    expect(parseConfiguration(SMALL, parser).glueFunction).toEqual({ N: 1 })
  })

  it('separates robots from walls', () => {
    const config = parseConfiguration(SMALL, parser)
    expect(config.tiles.filter((t) => t.isConcrete)).toHaveLength(1)
    expect(config.tiles.filter((t) => !t.isConcrete)).toHaveLength(2)
  })

  it('treats a glue of "0" as no glue', () => {
    const tile = parseConfiguration(SMALL, parser).tiles[0]
    expect(tile.glues).toEqual(['', 'N', '', ''])
  })

  it('rejects a file that is not a configuration', () => {
    expect(() => parseConfiguration('<html><body>no</body></html>', parser)).toThrow(
      ConfigurationError,
    )
  })

  it('rejects a board larger than the limit', () => {
    const big = SMALL.replace('height="5" width="5"', 'height="250" width="250"')
    expect(() => parseConfiguration(big, parser)).toThrow(/larger than/)
  })

  it('ignores tiles outside the board', () => {
    const stray = SMALL.replace('x="4" y="4"', 'x="40" y="40"')
    expect(parseConfiguration(stray, parser).tiles).toHaveLength(2)
  })
})

describe('turning a configuration into a board', () => {
  it('places walls and robots where the file says', () => {
    const b = board(SMALL)
    expect(wallCells(b).sort((x, y) => x - y)).toEqual([24])
    expect(robotCells(b).sort((x, y) => x - y)).toEqual([6, 7])
  })

  it('bonds tiles whose glues match, so they move as one', () => {
    const b = board(SMALL)
    expect(b.polyominoes).toHaveLength(1)
    expect(b.polyominoes[0].tiles).toHaveLength(2)
  })

  it('keeps unglued tiles separate', () => {
    const unglued = SMALL.replace(/<EastGlue>N<\/EastGlue>/, '<EastGlue>0</EastGlue>')
    expect(board(unglued).polyominoes).toHaveLength(2)
  })
})

describe('writing a configuration', () => {
  it('survives a round trip without losing tiles', () => {
    const xml = serializeConfiguration(5, 5, [
      { cell: 6, isConcrete: false, glues: ['', 'N', '', ''] },
      { cell: 24, isConcrete: true },
    ])
    const config = parseConfiguration(xml, parser)

    expect(config.cols).toBe(5)
    expect(config.tiles).toHaveLength(2)
    expect(config.tiles.find((t) => !t.isConcrete)?.glues).toEqual(['', 'N', '', ''])
  })

  it('leaves out tiles that sit outside the board', () => {
    // Stored on a 15 wide grid but exported as 10 wide: x=14 must not be written.
    const xml = serializeConfiguration(10, 10, [{ cell: 14, isConcrete: false }], 15)
    expect(xml).not.toContain('x="14"')
    expect(parseConfiguration(xml, parser).tiles).toHaveLength(0)
  })
})

describe('the vendored research configurations', () => {
  it('loads Cat at its published size', () => {
    const config = parseConfiguration(cat, parser)
    expect([config.cols, config.rows]).toEqual([45, 45])
  })

  it('reads its glue function', () => {
    expect(parseConfiguration(cat, parser).glueFunction).toEqual({ N: 1, E: 1, S: 1, W: 1 })
  })

  it('has both robots and walls', () => {
    const b = board(cat)
    expect(robotCells(b).length).toBeGreaterThan(0)
    expect(wallCells(b).length).toBeGreaterThan(0)
  })

  it('assembles into fewer polyominoes than it has tiles, because glues bond', () => {
    const b = board(cat)
    const tiles = b.polyominoes.reduce((n, p) => n + p.tiles.length, 0)
    expect(b.polyominoes.length).toBeLessThan(tiles)
  })

  it('keeps every robot on the board through a command', () => {
    const b = board(cat)
    const before = robotCells(b).length
    tumble(b, 'S')
    expect(robotCells(b)).toHaveLength(before)
  })
})

describe('desktop-compatible blank labels', () => {
  it('writes zero for absent and empty labels and keeps nonempty labels escaped', () => {
    for (const label of [undefined, '']) {
      const xml = serializeConfiguration(2, 2, [{ cell: 0, isConcrete: false, label }])
      expect(xml).toContain('<Label>0</Label>')
      expect(parseConfiguration(xml, parser).tiles[0].label).toBe('0')
    }
    const imported = parseConfiguration(SMALL, parser)
    expect(imported.tiles[0].label).toBe('')
    const xml = serializeConfiguration(5, 5, imported.tiles.map((t) => ({ ...t, cell: t.y * 5 + t.x })))
    expect(xml.match(/<Label>0<\/Label>/g)).toHaveLength(3)
    const named = serializeConfiguration(2, 2, [{ cell: 0, isConcrete: false, label: 'A & <B>' }])
    expect(parseConfiguration(named, parser).tiles[0].label).toBe('A & <B>')
  })
})
