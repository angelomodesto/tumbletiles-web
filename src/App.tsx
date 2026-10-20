import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react' // Lets the page use state and respond to keyboard controls
import './App.css'
import Demo from './Demo.tsx'
import TutorialBoard from './TutorialBoard.tsx'
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
  const [tutorialHasMoved, setTutorialHasMoved] = useState(false) // Tracks whether the user has moved the tutorial robot
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
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}presets/${preset.file}`)
      if (!response.ok) throw new Error(`Could not fetch ${preset.file}.`)
      loadConfiguration(parseConfiguration(await response.text()))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'That preset could not be loaded.')
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


  /** The only tool each hands-on step allows. Step 5 unlocks all of them. */
  const TOOL_FOR_STEP: Record<number, Tool> = { 2: 'wall', 3: 'robot', 4: 'erase' }

  /**
   * Moves to a tutorial step and selects that step's tool, so the toolbar always
   * matches what the instructions ask for.
   */
  const goToTutorialStep = (step: number) => {
    setTutorialStep(step)
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
    const onResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
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

  const moveUp = () => applyMove('N') // Moves all robots upward
  const moveDown = () => applyMove('S') // Moves all robots downward
  const moveLeft = () => applyMove('W') // Moves all robots to the left
  const moveRight = () => applyMove('E') // Moves all robots to the right

  useEffect(() => { // Listens for keyboard arrow key presses
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!showSimulator && !showTutorial) return // Only uses arrow keys in the simulator or tutorial

      if (event.key === 'ArrowUp') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveUp() // Moves robots up in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          applyTutorialMove('N') // Moves the tutorial robots with the engine
        }
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveDown() // Moves robots down in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          applyTutorialMove('S') // Moves the tutorial robots with the engine
        }
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveLeft() // Moves robots left in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          applyTutorialMove('W') // Moves the tutorial robots with the engine
        }
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveRight() // Moves robots right in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          applyTutorialMove('E') // Moves the tutorial robots with the engine
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown) // Starts listening for key presses

    return () => {
      window.removeEventListener('keydown', handleKeyDown) // Stops listening when no longer needed
    }
  }, [showSimulator, showTutorial, tutorialStep, robots, walls])



// Tutorial page
  // The animation plays before the tutorial, so a new visitor sees the model
  // run once before being asked to build a board themselves.
  if (showDemo) {
    return (
      <Demo
        onDone={() => {
          setShowDemo(false) // Ends the animation
          setShowTutorial(true) // Hands over to the interactive steps
        }}
      />
    )
  }

if (showTutorial) {
  return (
    <div className="tutorial-page"> {/* Main tutorial page */}

      <button
        type="button"
        onClick={() => {
          goToTutorialStep(1) // Resets to Step 1
          setTutorialRobots([]) // Clears tutorial robots
          setTutorialWalls([]) // Clears tutorial walls
          setTutorialHasMoved(false) // Resets movement progress
          setTutorialWallPlaced(false) // Resets wall progress
          setTutorialRobotPlaced(false) // Resets robot progress
          setTutorialHasErased(false) // Resets erase progress
          setTutorialTool('wall') // Selects Wall as the starting tool
          setShowTutorial(false) // Returns to home
        }}
      >
        ← Back to Home
      </button>

      <h1>Tumble Tiles Tutorial</h1> {/* Tutorial page title */}

      <p>
        Learn how to use the Tumble Tiles simulator step by step.
      </p> {/* Short description of the tutorial */}

      <div className="tutorial-content"> {/* Holds the current tutorial step */}

        {tutorialStep === 1 && (
          <div> {/* Shows the introduction only during step 1 */}

            <h2>Step 1: Introduction</h2>

            <p>
              Tumble Tiles lets you place robots and obstacles on a board and move the robots in different directions.
            </p>

            <button
              type="button"
              onClick={() => setTutorialStep(2)} /* Moves to tutorial step 2 */
            >
              Next →
            </button>

          </div>
        )}


        {tutorialStep === 2 && (
          <div> {/* Shows the wall instructions only during step 2 */}

            <h2>Step 2: Place a Wall</h2>

            <p>
              Walls never move. Click any empty square to place one. Only the Wall tool
              is available on this step.
            </p>

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
              }}
              onErase={() => {}}
            />

            <div className="tutorial-nav">
              <button type="button" onClick={() => goToTutorialStep(1)}>
                ← Back
              </button>

              {tutorialWallPlaced && (
                <button type="button" className="tutorial-button" onClick={() => goToTutorialStep(3)}>
                  Next →
                </button>
              )}
            </div>

          </div>
        )}


        {tutorialStep === 3 && (
          <div> {/* Shows the robot instructions only during step 3 */}

            <h2>Step 3: Place a Robot</h2>

            <p>
              Robots are what the commands move. Click an empty square to place one.
              Your wall from the last step is still there.
            </p>

            <TutorialBoard
              robots={tutorialRobots}
              walls={tutorialWalls}
              tool={tutorialTool}
              allowed={['robot']}
              onSelectTool={setTutorialTool}
              onPlaceRobot={(cell) => {
                setTutorialRobots([...tutorialRobots, cell]) // Places a robot
                setTutorialRobotPlaced(true) // Records that the step is done
              }}
              onPlaceWall={() => {}}
              onErase={() => {}}
            />

            <div className="tutorial-nav">
              <button type="button" onClick={() => goToTutorialStep(2)}>
                ← Back
              </button>

              {tutorialRobotPlaced && (
                <button type="button" className="tutorial-button" onClick={() => goToTutorialStep(4)}>
                  Next →
                </button>
              )}
            </div>

          </div>
        )}


        {tutorialStep === 4 && (
          <div> {/* Shows the erase instructions only during step 4 */}

            <h2>Step 4: Use Erase</h2>

            <p>
              Erase removes whatever is in a square. Click one of the robots or walls
              you placed to take it off the board.
            </p>

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
              }}
            />

            <div className="tutorial-nav">
              <button type="button" onClick={() => goToTutorialStep(3)}>
                ← Back
              </button>

              {tutorialHasErased && (
                <button type="button" className="tutorial-button" onClick={() => goToTutorialStep(5)}>
                  Next →
                </button>
              )}
            </div>

          </div>
        )}


        {tutorialStep === 5 && (
          <div> {/* Shows the movement instructions only during step 5 */}

            <h2>Step 5: Move the Robots</h2>

            <p>
              Every command moves all robots at once. They keep going until they reach the
              edge of the board, a wall, or another robot. All three tools are available
              now, so build a board and try it.
            </p>

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
            />

            <div className="tutorial-movement"> {/* Holds the tutorial movement buttons */}
              <button type="button" onClick={() => applyTutorialMove('N')}>↑</button>
              <button type="button" onClick={() => applyTutorialMove('W')}>←</button>
              <button type="button" onClick={() => applyTutorialMove('S')}>↓</button>
              <button type="button" onClick={() => applyTutorialMove('E')}>→</button>
            </div>

            <div className="tutorial-nav">
              <button type="button" onClick={() => goToTutorialStep(4)}>
                ← Back
              </button>

              {tutorialHasMoved && (
                <button type="button" className="tutorial-button" onClick={() => goToTutorialStep(6)}>
                  Next →
                </button>
              )}
            </div>

          </div>
        )}


        {tutorialStep === 6 && (
          <div> {/* Shows the final tutorial step */}

            <h2>Step 6: Tutorial Complete!</h2>

            <p>
              You now know the basics of using the Tumble Tiles simulator. You can place robots and walls, erase objects, and move robots around the board.
            </p>

            <button
              type="button"
              onClick={() => goToTutorialStep(5)}
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={() => {
                goToTutorialStep(1) // Resets to Step 1
                setTutorialRobots([]) // Clears tutorial robots
                setTutorialWalls([]) // Clears tutorial walls
                setTutorialHasMoved(false) // Resets movement progress
                setTutorialWallPlaced(false) // Resets wall progress
                setTutorialRobotPlaced(false) // Resets robot progress
                setTutorialHasErased(false) // Resets erase progress
                setTutorialTool('wall') // Selects Wall as the starting tool
                setShowTutorial(false) // Leaves the tutorial
                setShowSimulator(true) // Drops straight into the simulator
              }}
            >
              Finish Tutorial
            </button>

          </div>
        )}

      </div> {/* Closes tutorial content */}

    </div> /* Closes tutorial page */
  )
}



  // The board panel has the page padding either side, and leaves room for the
  // toolbars above it; below the floor in cellSizeFor the panel scrolls instead.
  const cellSize = cellSizeFor(boardWidth, boardHeight, viewport.width - 120, viewport.height - 320)

  // Simulator page
  if (showSimulator) {
    return (
      <div className="simulator-page"> {/* Main simulator page */}

        <button
          type="button"
          onClick={() => setShowSimulator(false)} /* Returns to the landing page */
        >
          ← Back to Home
        </button>

        <h1>Tumble Tiles Simulator</h1> {/* Simulator page title */}

        <p>
          Build, control, and experiment with Tumble Tiles.
        </p> {/* Short description of the simulator */}

        <div className="simulator-tools"> {/* Holds the tools used to edit the board */}
          <h2>Tools</h2> {/* Tools section title */}

          <button
            type="button"
            className={selectedTool === 'robot' ? 'active-tool' : ''} /* Highlights Robot when selected */
            onClick={() => setSelectedTool('robot')} /* Selects the Robot tool */
          >
            Robot
          </button>

          <button
            type="button"
            className={selectedTool === 'wall' ? 'active-tool' : ''} /* Highlights Wall when selected */
            onClick={() => setSelectedTool('wall')} /* Selects the Wall tool */
          >
            Wall
          </button>

          <button
            type="button"
            className={selectedTool === 'erase' ? 'active-tool' : ''} /* Highlights Erase when selected */
            onClick={() => setSelectedTool('erase')} /* Selects the Erase tool */
          >
            Erase
          </button>

          <label className="import-button">
            Import XML
            <input
              type="file"
              accept=".xml"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0] // Gets the selected file

                if (file) {
                  void handleImport(file) // Imports the XML file
                }

                e.target.value = '' // Allows selecting the same file again
              }}
            />
          </label>


          <button onClick={handleExport} className="import-button">
            Export XML
          </button>

        </div> {/* End of Tools */}


        {presets.length > 0 && (
          <div className="board-presets"> {/* Configurations that ship with the simulator */}
            <h2>Presets</h2>

            <select
              value=""
              onChange={(event) => {
                const preset = presets.find((item) => item.id === event.target.value)
                if (preset !== undefined) void handleLoadPreset(preset)
              }}
            >
              <option value="">Choose a configuration…</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} — {preset.cols}x{preset.rows}, {preset.robots} robots
                </option>
              ))}
            </select>

            <span className="board-presets-note">
              From the research group's verification set.
            </span>
          </div>
        )}

        {loadError !== '' && (
          <p className="board-error" role="alert">
            {loadError}
          </p>
        )}



        <div className="board-settings"> {/* Holds settings for the simulator board */}
          <h2>Board Settings</h2> {/* Board settings title */}

          <label>
            Width:
            <input
              type="number"
              min={1}
              max={MAX_BOARD_SIZE}
              value={widthText}
              onBlur={() => setWidthText(String(boardWidth))} /* Puts back the real width if the field was left empty */
              onChange={(event) => {
                setWidthText(event.target.value) // Always lets the field show what was typed, including empty

                const newWidth = Number(event.target.value) // Gets the new width

                // An empty or out-of-range field is left alone until it is valid,
                // so the board is not resized half way through typing a number.
                if (!Number.isInteger(newWidth) || newWidth < 1 || newWidth > MAX_BOARD_SIZE) return

                const newStorageWidth = Math.max(storageWidth, newWidth) // Keeps space for hidden objects

                // Updates robot positions using the storage width
                setRobots(robots.map((index) => {
                  const x = index % storageWidth // Original column
                  const y = Math.floor(index / storageWidth) // Original row

                  return y * newStorageWidth + x // Preserves the original coordinates
                }))

                // Updates wall positions using the storage width
                setWalls(walls.map((index) => {
                  const x = index % storageWidth // Original column
                  const y = Math.floor(index / storageWidth) // Original row

                  return y * newStorageWidth + x // Preserves the original coordinates
                }))

                setStorageWidth(newStorageWidth) // Updates the storage width
                setBoardWidth(newWidth) // Updates the visible width
              }}
            />
          </label>

          <label>
            Height:
            <input
              type="number"
              min={1}
              max={MAX_BOARD_SIZE}
              value={heightText}
              onBlur={() => setHeightText(String(boardHeight))} /* Puts back the real height if the field was left empty */
              onChange={(event) => {
                setHeightText(event.target.value) // Always lets the field show what was typed, including empty

                const newHeight = Number(event.target.value) // Gets the new height

                if (!Number.isInteger(newHeight) || newHeight < 1 || newHeight > MAX_BOARD_SIZE) return

                setBoardHeight(newHeight) // Changes height without deleting robots or walls
              }}
            />
          </label>


          <button
            type="button"
            onClick={() => {
              setRobots([]) // Removes all robots from the board
              setWalls([]) // Removes all walls from the board
              setStorageWidth(boardWidth) // Nothing is hidden any more, so stop reserving extra columns
            }}
          >
            Clear Board
          </button>
        </div>



        <div className="simulator-board"> {/* Holds the Tumble Tiles board */} 
          <h2>Board</h2> {/* Board section title */} 
 
          <div
            className="board-grid"
            style={{
              // Drives .board-cell's size as well as the tracks, so the cells
              // actually shrink rather than overflowing a clamped grid box.
              '--cell': `${cellSize}px`,
              gridTemplateColumns: `repeat(${boardWidth}, ${cellSize}px)`,
              gridTemplateRows: `repeat(${boardHeight}, ${cellSize}px)`,
            } as CSSProperties} /* Sizes the grid to the board, shrinking the cells so it fits the window */
          > 
            {Array.from({ length:  boardWidth * boardHeight }).map((_, index) => (
              <div 
                className={`board-cell ${
                  robots.includes(Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)) ? 'robot' : ''
                } ${
                  walls.includes(Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)) ? 'wall' : ''
                }`}
                key={index}
                onClick={() => {
                  // Converts the clicked square into its stored position
                  const storedIndex = Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)

                  // Places a robot only if the square is empty
                  if (selectedTool === 'robot' && !robots.includes(storedIndex) && !walls.includes(storedIndex)) {
                    setRobots([...robots, storedIndex]) // Saves the robot at its stored position
                  }

                  // Places a wall only if the stored square is empty
                  if (selectedTool === 'wall' && !walls.includes(storedIndex) && !robots.includes(storedIndex)) {
                    setWalls([...walls, storedIndex]) // Saves the wall at its stored position
                  }

                  // Erases a robot or wall from the clicked square
                  if (selectedTool === 'erase') {
                    setRobots(robots.filter((robot) => robot !== storedIndex)) // Removes the robot
                    setWalls(walls.filter((wall) => wall !== storedIndex)) // Removes the wall
                  }
                }}
              ></div> /* Creates one square for the board */
            ))}
          </div>
        </div> {/* Closes the simulator board */}

        <div className="movement-controls"> {/* Holds the controls used to move the robots */}
          <h2>Movement</h2> {/* Movement controls title */}

          <button
            type="button"
            onClick={moveUp} /* Moves the robots upward when clicked */
          >
            ↑
          </button> {/* Moves robots up */}

          <button
            type="button"
            onClick={moveLeft} /* Moves the robots to the left when clicked */
          >
            ←
          </button> {/* Moves robots left */}
          
          <button
            type="button"
            onClick={moveDown} /* Moves the robots downward when clicked */
          >
            ↓
          </button> {/* Moves robots down */}
          
          <button
            type="button"
            onClick={moveRight} /* Moves the robots to the right when clicked */
          >
            →
          </button> {/* Moves robots right */}
        </div>
 
      </div> 
    )
  }

 // Landing page
  return (
    <>
      <section id="center" className="landing-page"> {/* Main landing page section */}
        <div className="landing-intro"> {/* Holds the landing page title and description */}
          <h1>Tumble Tiles</h1> {/* Main title shown on the landing page */}
          <p className="landing-description">
            Explore swarm robotics through an interactive Tumble Tiles simulator.
          </p> {/* Short description of the simulator */}
        </div>

        <div className="landing-buttons"> {/* Holds the landing page buttons */}
          <button 
            type="button" 
            className="tutorial-button" /* Styles the Start Tutorial button */
            onClick={() => setShowDemo(true)} /* Plays the animation, which then opens the tutorial */
          > 
            Start Tutorial
          </button> {/* Button that will eventually start the tutorial */}

          <button 
            type="button" 
            className="simulator-button" /* Styles the Open Simulator button */
            onClick={() => setShowSimulator(true)} /* Changes to the simulator when clicked */
          > 
            Open Simulator
          </button> {/* Button that will eventually open the simulator */}
        </div>

        <div className="about-section"> {/* Holds information about Tumble Tiles */}
          <h2>What is Tumble Tiles?</h2> {/* Heading for the information section */}

          <p>
            Tumble Tiles is a simulator for experimenting with swarm robotics and tile movement.
          </p> {/* Brief explanation of Tumble Tiles */}
        </div>

      </section>

    </>
  )
}

export default App
