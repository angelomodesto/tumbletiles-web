/** The three editing tools, in the order the simulator shows them. */
export const TOOLS = ['robot', 'wall', 'erase'] as const

export type Tool = (typeof TOOLS)[number]

/** The tutorial practice board is square, the same shape as the demo's. */
export const TUTORIAL_SIZE = 8
export const TUTORIAL_CELLS = TUTORIAL_SIZE * TUTORIAL_SIZE

/** Label shown on each tool's button. */
export const TOOL_LABELS: Record<Tool, string> = {
  robot: 'Robot',
  wall: 'Wall',
  erase: 'Erase',
}
