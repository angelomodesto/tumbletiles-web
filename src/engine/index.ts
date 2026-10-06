export type {
  Board,
  Direction,
  GlueFunction,
  Glues,
  Polyomino,
  Position,
  Tile,
} from './types'
export { DELTA } from './types'
export {
  CONCRETE_POLY_ID,
  NO_GLUES,
  addConcrete,
  addPolyomino,
  addTile,
  createBoard,
  fromIndex,
  inBounds,
  occupancy,
  tileAt,
  toIndex,
} from './board'
export {
  DEFAULT_GLUE_FUNCTION,
  DEFAULT_TEMPERATURE,
  activateGlues,
  canJoin,
  join,
} from './glue'
export { step, tumble } from './step'
export type { TumbleOptions } from './step'
