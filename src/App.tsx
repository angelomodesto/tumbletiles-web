import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react' // Lets the page use state and respond to keyboard controls
import './App.css'
import Demo from './Demo.tsx'
import LandingPreview from './LandingPreview.tsx'
import SiteHeader from './SiteHeader.tsx'
import type { Page } from './SiteHeader.tsx'
import { hasVisited, markVisited } from './visited'
import TutorialBoard from './TutorialBoard.tsx'
import TutorialStep from './TutorialStep.tsx'
import { TOOLS, TUTORIAL_SIZE } from './tutorialTools'
import type { Tool } from './tutorialTools'
import { cellSizeFor } from './boardLayout'
import type { Configuration } from './engine/xml'
import {
  configurationToBoard,
  parseConfiguration,
  robotCells,
  serializeConfiguration,
  wallCells,
} from './engine/xml'
import type { Preset } from './presets'
import { loadPresetIndex } from './presets'
import type { Direction, GlueFunction, Glues } from './engine'
import {
  DEFAULT_GLUE_FUNCTION,
  addConcrete,
  addTile,
  createBoard,
  fromIndex,
  toIndex,
  tumble,
} from './engine'

/**
 * Largest board we will render. 100 matches the desktop application's default
 * and keeps the cell count low enough that the page stays responsive.
 */
const MAX_BOARD_SIZE = 100

function App() {
  // State
  const [showSimulator, setShowSimulator] = useState(false) // Tracks whether the simulator should be shown
  const [showTutorial, setShowTutorial] = useState(false) // Tracks whether the tutorial should be shown
  const [showDemo, setShowDemo] = useState(false) // Tracks whether the opening animation should be shown
  const [tutorialStep, setTutorialStep] = useState(1) // Tracks which tutorial step the user is currently on
  const [tutorialTool, setTutorialTool] = useState<Tool>('wall') // Tracks which tool is selected during the tutorial
  const [tutorialWallPlaced, setTutorialWallPlaced] = useState(false) // Remembers if the user has placed a wall
  const [tutorialRobotPlaced, setTutorialRobotPlaced] = useState(false) // Remembers if the user has placed a robot
  const [tutorialHasErased, setTutorialHasErased] = useState(false) // Remembers if the user erased an object
  const [tutorialRobots, setTutorialRobots] = useState<number[]>([]) // Stores robots placed on the tutorial board
  const [tutorialWalls, setTutorialWalls] = useState<number[]>([]) // Stores walls placed on the tutorial board
  const [tutorialHasMoved, setTutorialHasMoved] = useState(false)
  const [tutorialHint, setTutorialHint] = useState('') // Explains why a click did nothing // Tracks whether the user has moved the tutorial robot
  const [selectedTool, setSelectedTool] = useState('robot') // Tracks which board tool is currently selected
  const [robots, setRobots] = useState<number[]>([]) // Stores which board cells contain robots
  const [walls, setWalls] = useState<number[]>([]) // Stores which board cells contain walls
  const [boardWidth, setBoardWidth] = useState(15) // Stores the board width, starting at 15
  const [boardHeight, setBoardHeight] = useState(15) // Stores the board height, starting at 15
  const [storageWidth, setStorageWidth] = useState(15) // Tracks the width used to store robot and wall positions
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  })) // Tracks the window size so the board can be sized to fit it
  const [tileGlues, setTileGlues] = useState<Record<number, Glues>>({}) // Glue labels for each robot, kept so constructions hold together
  const [glueFunction, setGlueFunction] = useState<GlueFunction>(DEFAULT_GLUE_FUNCTION) // How strongly each glue label bonds
  const [presets, setPresets] = useState<Preset[]>([]) // The configurations that ship with the simulator
  const [loadError, setLoadError] = useState('') // Explains why a file or preset could not be loaded
  const [loadingPreset, setLoadingPreset] = useState('') // Name of the configuration being fetched
  const [commandCount, setCommandCount] = useState(0) // How many commands have been given
  const [lastCommand, setLastCommand] = useState('') // The most recent command, for the status bar
  const [undoSnapshot, setUndoSnapshot] = useState<null | { robots: number[]; walls: number[]; glues: Record<number, Glues> }>(null)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [isNarrow, setIsNarrow] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 600,
  ) // Drives the simulator's note; the board needs room to be usable
  const [visited, setVisited] = useState(hasVisited) // Decides which landing action is emphasised // Explains why a file or preset could not be loaded
  const [widthText, setWidthText] = useState('15') // What the width field shows while it is being typed in
  const [heightText, setHeightText] = useState('15') // What the height field shows while it is being typed in
  /** Loads a parsed configuration onto the simulator board. */
  const loadConfiguration = (config: Configuration) => {
    const board = configurationToBoard(config)

    setBoardWidth(config.cols)
    setBoardHeight(config.rows)
    setStorageWidth(config.cols)
    setWidthText(String(config.cols))
    setHeightText(String(config.rows))
    setRobots(robotCells(board))
    setWalls(wallCells(board))
    setGlueFunction(config.glueFunction)

    // Glues are kept per cell so a construction still holds together when moved.
    const glues: Record<number, Glues> = {}
    for (const poly of board.polyominoes) {
      for (const tile of poly.tiles) glues[toIndex(tile, board.cols)] = tile.glues
    }
    setTileGlues(glues)
    setLoadError('')
    setUndoSnapshot(null) // The cleared board is gone once something else is loaded
    setCommandCount(0)
    setLastCommand('')
  }

  const handleImport = async (file: File) => { // Handles the XML file selected by the user
    try {
      loadConfiguration(parseConfiguration(await file.text()))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'That file could not be read.')
    }
  }

  /** Loads one of the configurations that ship with the simulator. */
  const handleLoadPreset = async (preset: Preset) => {
    setLoadError('')
    setLoadingPreset(preset.name) // Shown in the board's place while the file is fetched
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}presets/${preset.file}`)
      if (!response.ok) throw new Error(`Could not fetch ${preset.file}.`)
      loadConfiguration(parseConfiguration(await response.text()))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'That preset could not be loaded.')
    } finally {
      setLoadingPreset('')
    }
  }

  const handleExport = () => { // Handles exporting the board as XML
    const xml = serializeConfiguration(
      boardWidth,
      boardHeight,
      [
        ...robots.map((cell) => ({ cell, isConcrete: false, glues: tileGlues[cell] })),
        ...walls.map((cell) => ({ cell, isConcrete: true })),
      ],
      storageWidth,
    )

    const blob = new Blob([xml], { type: 'application/xml' }) // Creates a file from our XML string
    const url = URL.createObjectURL(blob) // Creates a temporary download URL
    const link = document.createElement('a') // Creates a download link

    link.href = url // Sets the file's download URL
    link.download = 'tumbletiles-board.xml' // Names the downloaded file
    link.click() // Downloads the XML file

    URL.revokeObjectURL(url) // Cleans up the temporary URL
  }


  /** Sends the viewer to the landing page from wherever they are. */
  const goHome = () => {
    resetTutorial()
    setShowTutorial(false)
    setShowDemo(false)
    setShowSimulator(false)
  }

  /** Opens onboarding, which starts with the animation. */
  const goToTutorial = () => {
    resetTutorial()
    setShowSimulator(false)
    setShowTutorial(false)
    setShowDemo(true)
  }

  /** Opens the simulator, and remembers that onboarding has been seen. */
  const goToSimulator = () => {
    resetTutorial()
    setShowDemo(false)
    setShowTutorial(false)
    setShowSimulator(true)
    markVisited()
    setVisited(true)
  }

  /**
   * Every screen is returned through here, so the header occupies exactly the
   * same position on all of them rather than sitting inside each page's own
   * container and inheriting its padding.
   */
  const shell = (current: Page, content: ReactNode) => (
    <div className="app-shell">
      <SiteHeader
        current={current}
        onHome={goHome}
        onTutorial={goToTutorial}
        onSimulator={goToSimulator}
      />
      <main className="app-main">{content}</main>
    </div>
  )

  /** Puts the tutorial back to its first step with an empty board. */
  const resetTutorial = () => {
    setTutorialStep(1)
    setTutorialRobots([])
    setTutorialWalls([])
    setTutorialHasMoved(false)
    setTutorialWallPlaced(false)
    setTutorialRobotPlaced(false)
    setTutorialHasErased(false)
    setTutorialTool('wall')
    setTutorialHint('')
  }

  /** Leaves for the landing page. */
  const leaveTutorial = goHome

  /** Leaves straight for the simulator, from any step. */
  const skipToSimulator = goToSimulator

  /** Starts the tutorial again from step 1. */
  const restartTutorial = () => resetTutorial()

  /** The only tool each hands-on step allows. Step 5 unlocks all of them. */
  const TOOL_FOR_STEP: Record<number, Tool> = { 2: 'wall', 3: 'robot', 4: 'erase' }

  /**
   * Moves to a tutorial step and selects that step's tool, so the toolbar always
   * matches what the instructions ask for.
   */
  const goToTutorialStep = (step: number) => {
    setTutorialStep(step)
    setTutorialHint('') // A hint belongs to the step that produced it
    const tool = TOOL_FOR_STEP[step]
    if (tool !== undefined) setTutorialTool(tool)
  }

  /**
   * Moves the tutorial's robots with the same engine the simulator uses, so the
   * step demonstrates the real rules rather than an approximation.
   */
  const applyTutorialMove = (direction: Direction) => {
    const board = createBoard(TUTORIAL_SIZE, TUTORIAL_SIZE)

    tutorialWalls.forEach((cell) => {
      const { x, y } = fromIndex(cell, TUTORIAL_SIZE)
      addConcrete(board, x, y)
    })

    tutorialRobots.forEach((cell) => {
      const { x, y } = fromIndex(cell, TUTORIAL_SIZE)
      addTile(board, x, y)
    })

    tumble(board, direction)

    setTutorialRobots(
      board.polyominoes.flatMap((poly) => poly.tiles.map((tile) => toIndex(tile, TUTORIAL_SIZE))),
    )
    setTutorialHasMoved(true) // Records that the step is done
  }

  // Reads the list of bundled configurations once, when the app starts.
  useEffect(() => {
    loadPresetIndex().then(setPresets).catch(() => setPresets([]))
  }, [])

  // Keeps the board sized to the window as it changes.
  useEffect(() => {
    const onResize = () => {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      setIsNarrow(window.innerWidth < 600)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Movement
  // The rules live in src/engine, so they can be tested without the interface
  // and checked against the TumbleTiles desktop application. The board uses
  // flat cell numbers, so each move rebuilds an engine board, tumbles it, and
  // reads the positions back out.
  const applyMove = (direction: Direction) => {
    const board = createBoard(boardWidth, boardHeight)

    // Walls go on first so a robot can never be placed on top of one
    walls.forEach((cell) => {
      const { x, y } = fromIndex(cell, storageWidth) // Gets the wall's position

      if (x < boardWidth && y < boardHeight) { // Checks if wall is visible
        addConcrete(board, x, y) // Adds visible wall to simulation
      }
    })

    robots.forEach((cell) => {
      const { x, y } = fromIndex(cell, storageWidth) // Gets the robot's position

      if (x < boardWidth && y < boardHeight) { // Checks if robot is visible
        addTile(board, x, y, tileGlues[cell]) // Keeps the robot's glues, so bonded shapes stay bonded
      }
    })

    tumble(board, direction, { glueFunction })

    // Robots outside the visible board keep their positions and their glues.
    const hidden = robots.filter((cell) => {
      const { x, y } = fromIndex(cell, storageWidth)
      return x >= boardWidth || y >= boardHeight
    })

    const moved = board.polyominoes.flatMap((poly) => poly.tiles)
    const glues: Record<number, Glues> = {}
    for (const cell of hidden) {
      if (tileGlues[cell] !== undefined) glues[cell] = tileGlues[cell]
    }
    for (const tile of moved) {
      glues[toIndex(tile, storageWidth)] = tile.glues
    }

    setRobots([...hidden, ...moved.map((tile) => toIndex(tile, storageWidth))])
    setTileGlues(glues)
  }

  const DIRECTION_NAMES: Record<Direction, string> = { N: 'Up', E: 'Right', S: 'Down', W: 'Left' }

  /** Applies a command and records it for the status bar. The movement itself is unchanged. */
  const runCommand = (direction: Direction) => {
    applyMove(direction)
    setCommandCount((count) => count + 1)
    setLastCommand(DIRECTION_NAMES[direction])
  }

  const moveUp = () => runCommand('N') // Moves all robots upward
  const moveDown = () => runCommand('S') // Moves all robots downward
  const moveLeft = () => runCommand('W') // Moves all robots to the left
  const moveRight = () => runCommand('E') // Moves all robots to the right

  /** Clears the board, keeping a snapshot so the clear can be undone. */
  const clearBoard = () => {
    setUndoSnapshot({ robots, walls, glues: tileGlues })
    setRobots([])
    setWalls([])
    setTileGlues({})
    setStorageWidth(boardWidth)
    setLoadError('')
  }

  /** Puts back whatever the last clear removed. */
  const undoClear = () => {
    if (undoSnapshot === null) return
    setRobots(undoSnapshot.robots)
    setWalls(undoSnapshot.walls)
    setTileGlues(undoSnapshot.glues)
    setUndoSnapshot(null)
  }

  /**
   * Handles one arrow key, using whatever is on the board right now. Returns
   * whether the key was used, so the page only stops scrolling when it was.
   */
  const handleArrow = (direction: Direction): boolean => {
    if (showSimulator) {
      runCommand(direction)
      return true
    }

    if (showTutorial && tutorialStep === 5) {
      applyTutorialMove(direction)
      return true
    }

    return false
  }

  // The listener is attached once, but it must always see the current board.
  // Holding the handler in a ref does that; listing the board in the effect's
  // dependencies instead left the listener holding a stale copy, which made
  // robots jump back to an earlier position when an arrow key was pressed.
  const handleArrowRef = useRef(handleArrow)

  useEffect(() => {
    handleArrowRef.current = handleArrow
  })

  /** Tool and help keys, which only apply in the simulator. */
  const handleShortcut = (key: string): boolean => {
    if (!showSimulator) return false

    const tools: Record<string, string> = { r: 'robot', w: 'wall', e: 'erase' }
    const tool = tools[key.toLowerCase()]

    if (tool !== undefined) {
      setSelectedTool(tool)
      return true
    }

    if (key === '?') {
      setShowShortcuts((shown) => !shown)
      return true
    }

    return false
  }

  const shortcutsRef = useRef(handleShortcut)

  useEffect(() => {
    shortcutsRef.current = handleShortcut
  })

  useEffect(() => { // Listens for keyboard arrow key presses
    const DIRECTION_KEYS: Record<string, Direction> = {
      ArrowUp: 'N',
      ArrowRight: 'E',
      ArrowDown: 'S',
      ArrowLeft: 'W',
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Never steal a key from a field the viewer is typing in.
      const target = event.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return

      const direction = DIRECTION_KEYS[event.key]
      if (direction !== undefined) {
        if (handleArrowRef.current(direction)) {
          event.preventDefault() // Prevents the page from scrolling
        }
        return
      }

      if (shortcutsRef.current(event.key)) event.preventDefault()
    }

    window.addEventListener('keydown', handleKeyDown) // Starts listening for key presses

    return () => {
      window.removeEventListener('keydown', handleKeyDown) // Stops listening when no longer needed
    }
  }, [])



// Tutorial page
  // The animation plays before the tutorial, so a new visitor sees the model
  // run once before being asked to build a board themselves.
  if (showDemo) {
    return shell('tutorial', (
        <Demo
          onDone={() => {
            setShowDemo(false) // Ends the animation
            setShowTutorial(true) // Hands over to the interactive steps
          }}
          onSkip={goToSimulator} /* Straight to the simulator */
        />
      ))
  }

if (showTutorial) {
  return shell('tutorial', (
    <div className="tutorial-page"> {/* Main tutorial page */}

      <h1>Tumble Tiles Tutorial</h1> {/* Tutorial page title */}

      <p>
        Learn how to use the Tumble Tiles simulator step by step.
      </p> {/* Short description of the tutorial */}

      <div className="tutorial-content"> {/* Holds the current tutorial step */}

        {tutorialStep === 1 && (
          <TutorialStep
            step={1}
            title="What you will do"
            instruction="Build a small board, then move everything on it with one command."
            done
            successText="Ready when you are."
            onBack={leaveTutorial}
            onNext={() => goToTutorialStep(2)}
            onSkip={skipToSimulator}
          />
        )}


        {tutorialStep === 2 && (
          <TutorialStep
            step={2}
            title="Place a wall"
            instruction="Click an empty square to place a wall. Walls never move."
            done={tutorialWallPlaced}
            successText="Wall placed. It will stay exactly there."
            hint={tutorialHint}
            onBack={() => goToTutorialStep(1)}
            onNext={() => goToTutorialStep(3)}
            onSkip={skipToSimulator}
          >
            <TutorialBoard
              robots={tutorialRobots}
              walls={tutorialWalls}
              tool={tutorialTool}
              allowed={['wall']}
              onSelectTool={setTutorialTool}
              onPlaceRobot={() => {}}
              onPlaceWall={(cell) => {
                setTutorialWalls([...tutorialWalls, cell]) // Places a wall
                setTutorialWallPlaced(true) // Records that the step is done
                setTutorialHint('') // Clears any earlier hint
              }}
              onErase={() => {}}
              onBlocked={setTutorialHint}
            />
          </TutorialStep>
        )}


        {tutorialStep === 3 && (
          <TutorialStep
            step={3}
            title="Place a robot"
            instruction="Click an empty square to place a robot. Your wall is still there."
            done={tutorialRobotPlaced}
            successText="Robot placed. Add more if you like."
            hint={tutorialHint}
            onBack={() => goToTutorialStep(2)}
            onNext={() => goToTutorialStep(4)}
            onSkip={skipToSimulator}
          >
            <TutorialBoard
              robots={tutorialRobots}
              walls={tutorialWalls}
              tool={tutorialTool}
              allowed={['robot']}
              onSelectTool={setTutorialTool}
              onPlaceRobot={(cell) => {
                setTutorialRobots([...tutorialRobots, cell]) // Places a robot
                setTutorialRobotPlaced(true) // Records that the step is done
                setTutorialHint('')
              }}
              onPlaceWall={() => {}}
              onErase={() => {}}
              onBlocked={setTutorialHint}
            />
          </TutorialStep>
        )}


        {tutorialStep === 4 && (
          <TutorialStep
            step={4}
            title="Erase something"
            instruction="Click a robot or a wall to take it off the board."
            done={tutorialHasErased}
            successText="Erased. Put it back if you want it."
            hint={tutorialHint}
            onBack={() => goToTutorialStep(3)}
            onNext={() => goToTutorialStep(5)}
            onSkip={skipToSimulator}
          >
            <TutorialBoard
              robots={tutorialRobots}
              walls={tutorialWalls}
              tool={tutorialTool}
              allowed={['erase']}
              onSelectTool={setTutorialTool}
              onPlaceRobot={() => {}}
              onPlaceWall={() => {}}
              onErase={(cell) => {
                setTutorialRobots(tutorialRobots.filter((c) => c !== cell)) // Removes a robot
                setTutorialWalls(tutorialWalls.filter((c) => c !== cell)) // Removes a wall
                setTutorialHasErased(true) // Records that the step is done
                setTutorialHint('')
              }}
              onBlocked={setTutorialHint}
            />
          </TutorialStep>
        )}


        {tutorialStep === 5 && (
          <TutorialStep
            step={5}
            title="Move the robots"
            instruction="Press an arrow, or use the arrow keys. Every robot moves at once."
            done={tutorialHasMoved}
            successText="They stopped at a wall, an edge, or another robot."
            hint={tutorialHint}
            onBack={() => goToTutorialStep(4)}
            onNext={() => goToTutorialStep(6)}
            onSkip={skipToSimulator}
          >
            <TutorialBoard
              robots={tutorialRobots}
              walls={tutorialWalls}
              tool={tutorialTool}
              allowed={TOOLS}
              onSelectTool={setTutorialTool}
              onPlaceRobot={(cell) => setTutorialRobots([...tutorialRobots, cell])}
              onPlaceWall={(cell) => setTutorialWalls([...tutorialWalls, cell])}
              onErase={(cell) => {
                setTutorialRobots(tutorialRobots.filter((c) => c !== cell))
                setTutorialWalls(tutorialWalls.filter((c) => c !== cell))
              }}
              onBlocked={setTutorialHint}
            />

            <div className="arrow-pad"> {/* Movement controls, laid out like arrow keys */}
              <button type="button" onClick={() => applyTutorialMove('N')}>↑</button>
              <button type="button" onClick={() => applyTutorialMove('W')}>←</button>
              <button type="button" onClick={() => applyTutorialMove('S')}>↓</button>
              <button type="button" onClick={() => applyTutorialMove('E')}>→</button>
            </div>
          </TutorialStep>
        )}


        {tutorialStep === 6 && (
          <TutorialStep
            step={6}
            title="That is the whole model"
            instruction="One command moves every robot until something stops it. The simulator works the same way, with bigger boards and saved configurations."
            done
            successText="Tutorial complete."
            footer={
              <div className="tutorial-nav">
                <button type="button" onClick={() => goToTutorialStep(5)}>
                  ← Back
                </button>

                <button type="button" className="tutorial-button" onClick={skipToSimulator}>
                  Open Simulator →
                </button>

                <button type="button" className="tutorial-skip" onClick={restartTutorial}>
                  Replay tutorial
                </button>
              </div>
            }
          />
        )}

      </div> {/* Closes tutorial content */}

    </div> /* Closes tutorial page */
  ))
}



  // The board panel has the page padding either side, and leaves room for the
  // toolbars above it; below the floor in cellSizeFor the panel scrolls instead.
  const cellSize = cellSizeFor(boardWidth, boardHeight, viewport.width - 120, viewport.height - 320)

  // Simulator page
  if (showSimulator) {
    const isEmpty = robots.length === 0 && walls.length === 0

    return shell('simulator', (
      <div className="simulator-page"> {/* Main simulator page */}

        <h1>Tumble Tiles Simulator</h1>

        <div className="simulator-layout"> {/* Controls beside the board, which is the main thing */}

          <aside className="simulator-controls">

            {/* Most used, so it comes first. */}
            <section className="control-panel">
              <h2>Commands</h2>

              <div className="arrow-pad">
                <button type="button" onClick={moveUp} title="Move all robots up (↑)">↑</button>
                <button type="button" onClick={moveLeft} title="Move all robots left (←)">←</button>
                <button type="button" onClick={moveDown} title="Move all robots down (↓)">↓</button>
                <button type="button" onClick={moveRight} title="Move all robots right (→)">→</button>
              </div>

              <p className="control-hint">Arrow keys work too.</p>
            </section>

            <section className="control-panel">
              <h2>Tools</h2>

              <div className="control-row">
                <button
                  type="button"
                  title="Place robots (R)"
                  className={selectedTool === 'robot' ? 'active-tool' : ''}
                  onClick={() => setSelectedTool('robot')}
                >
                  Robot
                </button>

                <button
                  type="button"
                  title="Place walls (W)"
                  className={selectedTool === 'wall' ? 'active-tool' : ''}
                  onClick={() => setSelectedTool('wall')}
                >
                  Wall
                </button>

                <button
                  type="button"
                  title="Remove robots and walls (E)"
                  className={selectedTool === 'erase' ? 'active-tool' : ''}
                  onClick={() => setSelectedTool('erase')}
                >
                  Erase
                </button>
              </div>
            </section>

            {/* Saved boards and files belong together, away from the editing tools. */}
            <section className="control-panel">
              <h2>Configurations</h2>

              {presets.length > 0 && (
                <select
                  value=""
                  aria-label="Load a configuration"
                  onChange={(event) => {
                    const preset = presets.find((item) => item.id === event.target.value)
                    if (preset !== undefined) void handleLoadPreset(preset)
                  }}
                >
                  <option value="">Load a configuration…</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} — {preset.cols}x{preset.rows}, {preset.robots} robots
                    </option>
                  ))}
                </select>
              )}

              <div className="control-row">
                <label className="import-button">
                  Import XML
                  <input
                    type="file"
                    accept=".xml"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) void handleImport(file)
                    }}
                  />
                </label>

                <button type="button" className="import-button" onClick={handleExport}>
                  Export XML
                </button>
              </div>
            </section>

            <section className="control-panel">
              <h2>Board</h2>

              <div className="control-row">
                <label>
                  Width
                  <input
                    type="number"
                    min={1}
                    max={MAX_BOARD_SIZE}
                    value={widthText}
                    onBlur={() => setWidthText(String(boardWidth))}
                    onChange={(event) => {
                      setWidthText(event.target.value)

                      const newWidth = Number(event.target.value)
                      if (!Number.isInteger(newWidth) || newWidth < 1 || newWidth > MAX_BOARD_SIZE) return

                      const newStorageWidth = Math.max(storageWidth, newWidth)

                      setRobots(robots.map((index) => {
                        const x = index % storageWidth
                        const y = Math.floor(index / storageWidth)
                        return y * newStorageWidth + x
                      }))

                      setWalls(walls.map((index) => {
                        const x = index % storageWidth
                        const y = Math.floor(index / storageWidth)
                        return y * newStorageWidth + x
                      }))

                      setStorageWidth(newStorageWidth)
                      setBoardWidth(newWidth)
                    }}
                  />
                </label>

                <label>
                  Height
                  <input
                    type="number"
                    min={1}
                    max={MAX_BOARD_SIZE}
                    value={heightText}
                    onBlur={() => setHeightText(String(boardHeight))}
                    onChange={(event) => {
                      setHeightText(event.target.value)

                      const newHeight = Number(event.target.value)
                      if (!Number.isInteger(newHeight) || newHeight < 1 || newHeight > MAX_BOARD_SIZE) return

                      setBoardHeight(newHeight)
                    }}
                  />
                </label>
              </div>

              <p className="control-hint">Up to {MAX_BOARD_SIZE} × {MAX_BOARD_SIZE}.</p>
            </section>

            {/* Destructive, so it sits apart from the settings, with Undo in the status bar. */}
            <div className="control-danger">
              <button type="button" onClick={clearBoard} title="Remove every robot and wall">
                Clear board
              </button>
            </div>

          </aside>

          <main className="simulator-stage">
            {isNarrow && (
              <p className="narrow-note">
                This screen is narrow for a board. Everything still works, but the board scrolls
                inside its panel — a wider screen is easier. The tutorial reads well at this size.
              </p>
            )}

            <div className="board-panel"> {/* Height is reserved so loading never shifts the page */}
              {loadingPreset !== '' ? (
                <p className="board-message">Loading {loadingPreset}…</p>
              ) : (
                <>
                  <div
                    className="board-grid"
                    style={{
                      '--cell': `${cellSize}px`,
                      gridTemplateColumns: `repeat(${boardWidth}, ${cellSize}px)`,
                      gridTemplateRows: `repeat(${boardHeight}, ${cellSize}px)`,
                    } as CSSProperties}
                  >
                    {Array.from({ length: boardWidth * boardHeight }).map((_, index) => {
                      const { x, y } = fromIndex(index, boardWidth)
                      const storedIndex = y * storageWidth + x

                      return (
                        <div
                          className={`board-cell ${robots.includes(storedIndex) ? 'robot' : ''} ${walls.includes(storedIndex) ? 'wall' : ''}`}
                          key={index}
                          onClick={() => {
                            if (selectedTool === 'robot' && !robots.includes(storedIndex) && !walls.includes(storedIndex)) {
                              setRobots([...robots, storedIndex])
                            }

                            if (selectedTool === 'wall' && !walls.includes(storedIndex) && !robots.includes(storedIndex)) {
                              setWalls([...walls, storedIndex])
                            }

                            if (selectedTool === 'erase') {
                              setRobots(robots.filter((robot) => robot !== storedIndex))
                              setWalls(walls.filter((wall) => wall !== storedIndex))
                            }
                          }}
                        ></div>
                      )
                    })}
                  </div>

                  {/* Always rendered so the panel keeps its height whether
                      the board is empty or not. */}
                  <p className="board-message board-message-empty">
                    {isEmpty
                      ? 'Empty board. Pick a tool and click a square, or load a configuration.'
                      : ''}
                  </p>
                </>
              )}
            </div>

            {/* What the board is right now, in one line that is always present. */}
            <div className="status-bar">
              <span><b>Tool</b> {selectedTool}</span>
              <span><b>Board</b> {boardWidth} × {boardHeight}</span>
              <span><b>Robots</b> {robots.length}</span>
              <span><b>Walls</b> {walls.length}</span>
              <span><b>Commands</b> {commandCount}</span>
              <span><b>Last</b> {lastCommand === '' ? '—' : lastCommand}</span>

              {undoSnapshot !== null && (
                <button type="button" className="status-undo" onClick={undoClear}>
                  Undo clear
                </button>
              )}
            </div>

            {loadError !== '' && (
              <p className="board-error" role="alert">{loadError}</p>
            )}

            {showShortcuts && (
              <dl className="shortcuts">
                <dt>↑ ← ↓ →</dt><dd>Move every robot</dd>
                <dt>R</dt><dd>Robot tool</dd>
                <dt>W</dt><dd>Wall tool</dd>
                <dt>E</dt><dd>Erase tool</dd>
                <dt>?</dt><dd>Hide this list</dd>
              </dl>
            )}

            <button type="button" className="shortcuts-toggle" onClick={() => setShowShortcuts(!showShortcuts)}>
              {showShortcuts ? 'Hide shortcuts' : 'Keyboard shortcuts (?)'}
            </button>
          </main>

        </div>
      </div>
    ))
  }

 // Landing page
  return shell('home', (
    <>
      <section id="center" className="landing-page"> {/* Main landing page section */}

        <div className="landing-hero"> {/* Headline and actions */}

          <div className="landing-intro"> {/* The one thing to read first */}
            <h1>Tumble Tiles</h1>
            <p className="landing-lede">
              Give one command. Every robot moves at once.
            </p>
            <p className="landing-description">
              An interactive simulator for the Tumble Tiles model of algorithmic self-assembly,
              built with the Algorithmic Self-Assembly Research Group at UTRGV.
            </p>
          </div>

          <div className="landing-buttons"> {/* Primary action first, secondary beside it */}
            {/* Both are always offered; only which one dominates changes. */}
            <button
              type="button"
              className={visited ? 'simulator-button landing-secondary' : 'tutorial-button landing-primary'}
              onClick={goToTutorial}
            >
              Start Tutorial
            </button>

            <button
              type="button"
              className={visited ? 'tutorial-button landing-primary' : 'simulator-button landing-secondary'}
              onClick={goToSimulator}
            >
              Open Simulator
            </button>
          </div>

        </div>

        <LandingPreview />

      </section>

    </>
  ))
}

export default App
