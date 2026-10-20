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
}: TutorialBoardProps) {
  const handleCell = (cell: number) => {
    const occupied = robots.includes(cell) || walls.includes(cell)

    if (tool === 'robot' && allowed.includes('robot') && !occupied) onPlaceRobot(cell)
    if (tool === 'wall' && allowed.includes('wall') && !occupied) onPlaceWall(cell)
    if (tool === 'erase' && allowed.includes('erase') && occupied) onErase(cell)
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
