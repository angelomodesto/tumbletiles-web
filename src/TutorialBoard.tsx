import { TOOLS, TOOL_LABELS, TUTORIAL_CELLS } from './tutorialTools'
import type { Tool } from './tutorialTools'

interface TutorialBoardProps {
  robots: number[]
  walls: number[]
  tool: Tool
  /** Tools this step allows. The rest are shown but disabled, so the lock is visible. */
  allowed: readonly Tool[]
  onSelectTool: (tool: Tool) => void
  onPlaceRobot: (cell: number) => void
  onPlaceWall: (cell: number) => void
  onErase: (cell: number) => void
  /** Called when a click could not do anything, with the reason to show. */
  onBlocked?: (reason: string) => void
}

/**
 * The toolbar and practice board shared by every hands-on tutorial step. Each
 * step passes the tools it allows, so the board can only be used the way the
 * instructions describe.
 */
function TutorialBoard({
  robots,
  walls,
  tool,
  allowed,
  onSelectTool,
  onPlaceRobot,
  onPlaceWall,
  onErase,
  onBlocked,
}: TutorialBoardProps) {
  const handleCell = (cell: number) => {
    const occupied = robots.includes(cell) || walls.includes(cell)

    if (tool === 'erase') {
      if (occupied) onErase(cell)
      else onBlocked?.('That square is already empty. Click a robot or a wall to erase it.')
      return
    }

    if (occupied) {
      onBlocked?.('That square is taken. Try an empty one.')
      return
    }

    if (tool === 'robot') onPlaceRobot(cell)
    if (tool === 'wall') onPlaceWall(cell)
  }

  return (
    <>
      <div className="tutorial-tools">
        <span>[ TOOLS ]</span>

        {TOOLS.map((name) => (
          <button
            key={name}
            type="button"
            disabled={!allowed.includes(name)}
            className={tool === name ? 'active-tool' : ''}
            onClick={() => onSelectTool(name)}
          >
            {TOOL_LABELS[name]}
          </button>
        ))}
      </div>

      <div className="tutorial-board">
        {Array.from({ length: TUTORIAL_CELLS }).map((_, cell) => (
          <div
            key={cell}
            className={
              'tutorial-cell' +
              (robots.includes(cell) ? ' robot' : '') +
              (walls.includes(cell) ? ' wall' : '')
            }
            onClick={() => handleCell(cell)}
          ></div>
        ))}
      </div>
    </>
  )
}

export default TutorialBoard
