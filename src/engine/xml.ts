import type { Board, GlueFunction, Glues } from './types'
import { NO_GLUES, addConcrete, addTile, createBoard, fromIndex, toIndex } from './board'
import { DEFAULT_TEMPERATURE, activateGlues } from './glue'

/** A tile as it appears in a TumbleTiles .xml configuration. */
export interface ConfigTile {
  x: number
  y: number
  glues: Glues
  isConcrete: boolean
}

/** A whole configuration, as written by the TumbleTiles desktop application. */
export interface Configuration {
  cols: number
  rows: number
  /** Strength of each glue label, read from the file's GlueFunction. */
  glueFunction: GlueFunction
  tiles: ConfigTile[]
}

/** Anything that can turn a string of XML into a document. */
export interface XmlParser {
  parseFromString(text: string, type: 'application/xml'): Document
}

/** Thrown when a file is not a configuration we can use. */
export class ConfigurationError extends Error {}

/** Largest board we will load. Matches the simulator's own limit. */
export const MAX_BOARD_SIZE = 100

function textOf(parent: Element, tag: string): string {
  return parent.getElementsByTagName(tag)[0]?.textContent?.trim() ?? ''
}

/**
 * Reads a .xml configuration. Glue labels are kept, which is what lets a
 * construction from the research hold together when it is moved; reading only
 * positions would load it as a pile of loose tiles.
 */
export function parseConfiguration(
  xmlText: string,
  parser: XmlParser = new DOMParser() as XmlParser,
): Configuration {
  const doc = parser.parseFromString(xmlText, 'application/xml')

  const boardSize = doc.getElementsByTagName('BoardSize')[0]
  if (boardSize === undefined) {
    throw new ConfigurationError('This file has no BoardSize, so it is not a board configuration.')
  }

  const cols = Number(boardSize.getAttribute('width'))
  const rows = Number(boardSize.getAttribute('height'))

  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols <= 0 || rows <= 0) {
    throw new ConfigurationError('This board has no usable size.')
  }

  if (cols > MAX_BOARD_SIZE || rows > MAX_BOARD_SIZE) {
    throw new ConfigurationError(
      `This board is ${cols} by ${rows}, larger than the ${MAX_BOARD_SIZE} by ${MAX_BOARD_SIZE} limit.`,
    )
  }

  // GlueFunction lists each label and how strongly it bonds.
  const glueFunction: GlueFunction = {}
  const functions = doc.getElementsByTagName('Function')
  for (let i = 0; i < functions.length; i++) {
    const label = functions[i].getElementsByTagName('Labels')[0]?.getAttribute('L1')
    const strength = Number(textOf(functions[i], 'Strength'))
    if (label !== null && label !== undefined && label !== '' && Number.isFinite(strength)) {
      glueFunction[label] = strength
    }
  }

  // Only TileData holds tiles that are on the board; PreviewTiles are the
  // editor's palette and have no position.
  const tileData = doc.getElementsByTagName('TileData')[0]
  const tiles: ConfigTile[] = []

  if (tileData !== undefined) {
    const tileNodes = tileData.getElementsByTagName('Tile')

    for (let i = 0; i < tileNodes.length; i++) {
      const tile = tileNodes[i]
      const location = tile.getElementsByTagName('Location')[0]
      if (location === undefined) continue

      const x = Number(location.getAttribute('x'))
      const y = Number(location.getAttribute('y'))

      if (!Number.isInteger(x) || !Number.isInteger(y)) continue
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue

      // A glue of "0" means no glue, which is how the desktop app writes a blank.
      const glue = (tag: string) => {
        const label = textOf(tile, tag)
        return label === '0' ? '' : label
      }

      tiles.push({
        x,
        y,
        glues: [glue('NorthGlue'), glue('EastGlue'), glue('SouthGlue'), glue('WestGlue')],
        isConcrete: textOf(tile, 'Concrete') === 'True',
      })
    }
  }

  return { cols, rows, glueFunction, tiles }
}

/**
 * Builds a board from a configuration and bonds any tiles whose glues match, so
 * a construction arrives already assembled into its polyominoes.
 */
export function configurationToBoard(config: Configuration): Board {
  const board = createBoard(config.cols, config.rows)

  // Walls first, so a tile can never be placed on one.
  for (const tile of config.tiles) {
    if (tile.isConcrete) addConcrete(board, tile.x, tile.y)
  }

  for (const tile of config.tiles) {
    if (!tile.isConcrete) addTile(board, tile.x, tile.y, tile.glues)
  }

  activateGlues(board, config.glueFunction, DEFAULT_TEMPERATURE)
  return board
}

/** One tile on its way out to a file. */
export interface ExportTile {
  cell: number
  isConcrete: boolean
  glues?: Glues
}

/**
 * Writes a configuration in the same shape the desktop application reads.
 * Tiles outside the board are left out, so a file always matches its own
 * BoardSize and survives a round trip.
 */
export function serializeConfiguration(
  cols: number,
  rows: number,
  tiles: ExportTile[],
  storageWidth: number = cols,
): string {
  const tileXml = tiles
    .map((tile) => ({ ...tile, ...fromIndex(tile.cell, storageWidth) }))
    .filter((tile) => tile.x < cols && tile.y < rows)
    .map((tile) => {
      const glues = tile.glues ?? NO_GLUES
      const label = (value: string) => (value === '' ? '0' : value)

      return `    <Tile>
      <Location x="${tile.x}" y="${tile.y}" />
      <Color>${tile.isConcrete ? '686868' : '85AFCD'}</Color>
      <NorthGlue>${label(glues[0])}</NorthGlue>
      <SouthGlue>${label(glues[2])}</SouthGlue>
      <EastGlue>${label(glues[1])}</EastGlue>
      <WestGlue>${label(glues[3])}</WestGlue>
      <Concrete>${tile.isConcrete ? 'True' : 'False'}</Concrete>
      <Label>0</Label>
    </Tile>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<TileConfiguration>
  <BoardSize height="${rows}" width="${cols}" />
  <GlueFunction />
  <PreviewTiles />
  <TileData>
${tileXml}
  </TileData>
</TileConfiguration>
`
}

/** Reads the robot positions out of a board as flat cell indices. */
export function robotCells(board: Board): number[] {
  return board.polyominoes.flatMap((poly) =>
    poly.tiles.map((tile) => toIndex(tile, board.cols)),
  )
}

/** Reads the wall positions out of a board as flat cell indices. */
export function wallCells(board: Board): number[] {
  return board.concrete.map((tile) => toIndex(tile, board.cols))
}
