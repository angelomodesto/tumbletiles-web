import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react' // Lets the page use state and respond to keyboard controls
import './App.css'
import Demo from './Demo.tsx'
import TutorialBoard from './TutorialBoard.tsx'
import { TOOLS, TUTORIAL_SIZE } from './tutorialTools'
import type { Tool } from './tutorialTools'
import { cellSizeFor } from './boardLayout'
import type { Direction } from './engine'
import { addConcrete, addTile, createBoard, fromIndex, toIndex, tumble } from './engine'

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
  const [selectedCells, setSelectedCells] = useState<number[]>([]) // Stores the positions of selected robots and walls
  const [isSelecting, setIsSelecting] = useState(false) // Tracks whether the user is holding down the mouse to select squares
  const [draggedCell, setDraggedCell] = useState<number | null>(null) // Remembers which robot or wall we're dragging
  const [robots, setRobots] = useState<number[]>([]) // Stores which board cells contain robots
  const [walls, setWalls] = useState<number[]>([]) // Stores which board cells contain walls
  const [boardWidth, setBoardWidth] = useState(15) // Stores the board width, starting at 15
  const [boardHeight, setBoardHeight] = useState(15) // Stores the board height, starting at 15
  const [storageWidth, setStorageWidth] = useState(15) // Tracks the width used to store robot and wall positions
  const [viewport, setViewport] = useState(() => ({
    width: typeof window === 'undefined' ? 1200 : window.innerWidth,
    height: typeof window === 'undefined' ? 800 : window.innerHeight,
  })) // Tracks the window size so the board can be sized to fit it
  const [widthText, setWidthText] = useState('15') // What the width field shows while it is being typed in
  const [heightText, setHeightText] = useState('15') // What the height field shows while it is being typed in
  const handleImport = async (file: File) => { // Handles the XML file selected by the user
  const xmlText = await file.text() // Reads the file contents as text
  const parser = new DOMParser() // Creates a parser that can read XML
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml') // Converts the text into an XML document
  const boardSize = xmlDoc.querySelector('BoardSize') // Finds the BoardSize element in the XML

  if (!boardSize) return // Stops if the XML doesn't contain a BoardSize element

  const width = Number(boardSize.getAttribute('width')) // Gets the board width from XML
  const height = Number(boardSize.getAttribute('height')) // Gets the board height from XML

  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0 ||
    width > MAX_BOARD_SIZE ||
    height > MAX_BOARD_SIZE
  ) {
    return // Stops if the board dimensions are invalid
  }

  setBoardWidth(width) // Updates the simulator's board width
  setStorageWidth(width) // Matches stored positions to the imported board width
  setBoardHeight(height) // Updates the simulator's board height
  setWidthText(String(width)) // Keeps the width field showing the imported size
  setHeightText(String(height)) // Keeps the height field showing the imported size

  const tiles = xmlDoc.querySelectorAll('TileData > Tile') // Finds every placed tile in the XML

  const importedRobots: number[] = [] // Stores robot positions
  const importedWalls: number[] = [] // Stores wall positions

  tiles.forEach((tile) => { // Goes through each tile in the XML
    const location = tile.querySelector('Location') // Finds the tile's position

    if (!location) return // Skips tiles without a location

    const x = Number(location.getAttribute('x')) // Gets the X coordinate
    const y = Number(location.getAttribute('y')) // Gets the Y coordinate

    if (!Number.isInteger(x) || !Number.isInteger(y)) return // Skips invalid coordinates
    if (x < 0 || x >= width || y < 0 || y >= height) return // Skips positions outside the board

    const index = y * width + x // Stores the imported object's row and column

    const concrete = tile.querySelector('Concrete')?.textContent?.trim() // Reads whether the tile is concrete

    if (concrete === 'True') {
      importedWalls.push(index) // Concrete tiles are walls
    } else if (concrete === 'False') {
      importedRobots.push(index) // Non-concrete tiles are robots
    }
  }) // Ends the tiles.forEach() loop
  setRobots(importedRobots) // Places the imported robots on the board
  setWalls(importedWalls) // Places the imported walls on the board
  setSelectedCells([]) // Clears old orange highlights when importing a new board
  setDraggedCell(null) // Cancels any unfinished drag
  setIsSelecting(false) // Stops any active area selection
} // Ends the handleImport function


  const handleExport = () => { // Handles exporting the board as XML

    // Hidden objects sit outside the visible board, so they are left out of the
    // file. Exporting them would write coordinates past BoardSize, and the
    // importer would then discard them, losing data on a round trip.
    const isVisible = (index: number) => {
      const x = index % storageWidth
      const y = Math.floor(index / storageWidth)
      return x < boardWidth && y < boardHeight
    }

    const robotXML = robots.filter(isVisible).map((index) => { // Goes through every visible robot
      const x = index % storageWidth // Gets the robot's stored column
      const y = Math.floor(index / storageWidth) // Gets the robot's stored row

      return `
        <Tile>
          <Location x="${x}" y="${y}" />
          <Color>85AFCD</Color>
          <NorthGlue>0</NorthGlue>
          <SouthGlue>0</SouthGlue>
          <EastGlue>0</EastGlue>
          <WestGlue>0</WestGlue>
          <Concrete>False</Concrete>
          <Label>0</Label>
        </Tile>
      ` // Creates XML for this robot
    }).join('') // Combines all robots into one string


    const wallXML = walls.filter(isVisible).map((index) => { // Goes through every visible wall
      const x = index % storageWidth // Gets the wall's stored column
      const y = Math.floor(index / storageWidth) // Gets the wall's stored row

      return `
        <Tile>
          <Location x="${x}" y="${y}" />
          <Color>686868</Color>
          <NorthGlue>0</NorthGlue>
          <SouthGlue>0</SouthGlue>
          <EastGlue>0</EastGlue>
          <WestGlue>0</WestGlue>
          <Concrete>True</Concrete>
          <Label>0</Label>
        </Tile>
      ` // Creates XML for this wall
    }).join('') // Combines all walls into one string



    const xml = `
      <TileConfiguration>
        <BoardSize height="${boardHeight}" width="${boardWidth}" />
        <TileData>
          ${robotXML}
          ${wallXML}
        </TileData>
      </TileConfiguration>
    ` // Creates the XML with the board dimensions and robots

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

    walls.forEach((cell) => {
      const { x, y } = fromIndex(cell, storageWidth) // Gets the wall's position

      if (x < boardWidth && y < boardHeight) { // Checks if wall is visible
        addConcrete(board, x, y) // Adds visible wall to simulation
      }
    })

    robots.forEach((cell) => {
      const { x, y } = fromIndex(cell, storageWidth) // Gets the robot's position

      if (x < boardWidth && y < boardHeight) { // Checks if robot is visible
        addTile(board, x, y) // Adds visible robot to simulation
      }
    })

    tumble(board, direction)

    setRobots([
      // Keeps robots outside the visible board in their original positions
      ...robots.filter((cell) => {
        const { x, y } = fromIndex(cell, storageWidth)
        return x >= boardWidth || y >= boardHeight
      }),

      // Saves moved robots using the storage width
      ...board.polyominoes.flatMap((poly) =>
        poly.tiles.map((tile) => toIndex(tile, storageWidth)),
      ),
    ])
  }


  // Moves selected robots and walls one square in the chosen direction
  const moveSelection = (direction: Direction) => {

    // Stops the function if no objects are selected
    if (selectedCells.length === 0) return

    // Calculates horizontal movement: right = 1, left = -1
    const dx = direction === 'E' ? 1 : direction === 'W' ? -1 : 0

    // Calculates vertical movement: down = 1, up = -1
    const dy = direction === 'S' ? 1 : direction === 'N' ? -1 : 0

    // Creates a list of the new positions for all selected objects
    const newPositions = selectedCells.map((cell) => {

      // Finds the object's current column
      const x = cell % storageWidth

      // Finds the object's current row
      const y = Math.floor(cell / storageWidth)

      // Calculates its new column and row
      const newX = x + dx
      const newY = y + dy

      // Checks whether the new position is outside the board
      if (newX < 0 || newX >= boardWidth || newY < 0 || newY >= boardHeight) {
        return null // Marks this movement as invalid
      }

      // Converts the new coordinates back into a stored cell number
      return newY * storageWidth + newX
    })

    // Stops if any selected object would move outside the board
    if (newPositions.some((position) => position === null)) return

    // Checks whether any destination contains an unselected robot or wall
    const blocked = newPositions.some((position) =>
      position !== null &&
      (robots.includes(position) || walls.includes(position)) &&
      !selectedCells.includes(position)
    )

    // Cancels the entire movement if another object blocks the way
    if (blocked) return

    // Converts the valid destination positions into numbers
    const destinations = newPositions as number[]

    // Creates a mapping from each original position to its new position
    const movedCells = new Map(
      selectedCells.map((cell, index) => [cell, destinations[index]])
    )

    // Moves only the selected robots; unselected robots stay where they are
    setRobots(robots.map((cell) => movedCells.get(cell) ?? cell))

    // Moves only the selected walls; unselected walls stay where they are
    setWalls(walls.map((cell) => movedCells.get(cell) ?? cell))

    // Updates the selection so the orange outlines follow the moved objects
    setSelectedCells(destinations)
  }

  // Handles movement commands for the simulator
  const handleMovement = (direction: Direction) => {
  if (selectedTool === 'select' && selectedCells.length > 0) {
    moveSelection(direction) // Moves selected objects one square
  } else {
    setSelectedCells([]) // Clears old highlights
    applyMove(direction) // Runs normal simulation movement
  }
}

  // Each arrow passes its direction to our movement handler
  const moveUp = () => handleMovement('N') // N means North (up)
  const moveDown = () => handleMovement('S') // S means South (down)
  const moveLeft = () => handleMovement('W') // W means West (left)
  const moveRight = () => handleMovement('E') // E means East (right)

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
  }, [
    showSimulator,  // Updates keyboard controls when the simulator opens or closes
    showTutorial,   // Updates keyboard controls when the tutorial opens or closes
    tutorialStep,   // Tracks the current tutorial step
    robots,         // Uses the latest robot positions
    walls,          // Uses the latest wall positions
    selectedTool,   // Knows whether Select is currently active
    selectedCells,  // Uses the latest selected positions
    tutorialRobots, // Uses the latest tutorial robot positions
    tutorialWalls,  // Uses the latest tutorial wall positions
    ])



// Tutorial page
  // The animation plays before the tutorial, so a new visitor sees the model
  // run once before being asked to build a board themselves.
  if (showDemo) {
    return (
      <Demo
        onDone={() => {
          setShowDemo(false) // Ends the demonstration
          setShowTutorial(true) // Opens the interactive tutorial
        }}
        onBackHome={() => {
          setShowDemo(false) // Returns to the landing page
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
            onClick={() => {
            setSelectedTool('robot') // Activates the Robot tool

            // Finds highlighted squares that don't already contain objects
            const emptyCells = selectedCells.filter(
              (cell) => !robots.includes(cell) && !walls.includes(cell)
            )

            // Adds robots to all highlighted empty squares
            setRobots((previous) => [...previous, ...emptyCells])

            // Removes the orange highlights after placing the robots
            setSelectedCells([])
          }}
          >
            Robot
          </button>

          <button
            type="button"
            className={selectedTool === 'wall' ? 'active-tool' : ''} /* Highlights Wall when selected */
            onClick={() => {
              setSelectedTool('wall') // Activates the Wall tool

              // Finds highlighted squares that are empty
              const emptyCells = selectedCells.filter(
                (cell) => !robots.includes(cell) && !walls.includes(cell)
              )

              // Places walls in all highlighted empty squares
              setWalls((previous) => [...previous, ...emptyCells])

              // Clears the orange highlights after placing the walls
              setSelectedCells([])
            }}
          >
            Wall
          </button>

          <button
            type="button"
            className={selectedTool === 'erase' ? 'active-tool' : ''} /* Highlights Erase when selected */
            onClick={() => {
              setSelectedTool('erase') // Activates the Erase tool

              // Removes robots located in highlighted squares
              setRobots((previous) =>
                previous.filter((cell) => !selectedCells.includes(cell))
              )

              // Removes walls located in highlighted squares
              setWalls((previous) =>
                previous.filter((cell) => !selectedCells.includes(cell))
              )

              // Clears the orange highlights after erasing
              setSelectedCells([])
            }}
          >
            Erase
          </button>


          <button
            type="button"
            className={selectedTool === 'select' ? 'active-tool' : ''} // Highlights Select
            onClick={() => setSelectedTool('select')} // Activates Select
          >
            Select & Move
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
                
                setSelectedCells([]) // Clears old highlights before resizing the board
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

                setSelectedCells([]) // Clears orange highlights before resizing the board
                setBoardHeight(newHeight) // Changes height without deleting robots or walls
              }}
            />
          </label>


          <button
            type="button"
            onClick={() => {
              setRobots([]) // Removes all robots from the board
              setWalls([]) // Removes all walls from the board
              setSelectedCells([]) // Removes all orange highlights
              setStorageWidth(boardWidth) // Resets the storage width

              setDraggedCell(null) // Cancels any unfinished drag
              setIsSelecting(false) // Stops selecting multiple squares
            }}
          >
            Clear Board
          </button>
        </div>



        <div className="simulator-board"> {/* Holds the Tumble Tiles board */} 
          <h2>Board</h2> {/* Board section title */} 
 
          <div
          // Stops dragging when the mouse button is released
          onMouseUp={() => setIsSelecting(false)}

          // Also stops dragging if the mouse leaves the board
          onMouseLeave={() => {
            setIsSelecting(false) // Stops highlighting squares
            setDraggedCell(null) // Cancels dragging when leaving the board
          }}

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
                  // Checks whether this square contains a robot
                  robots.includes(Math.floor(index / boardWidth) * storageWidth + (index % boardWidth))
                    ? 'robot' // Adds the robot CSS class
                    : '' // Adds nothing if there is no robot
                } ${
                  // Checks whether this square contains a wall
                  walls.includes(Math.floor(index / boardWidth) * storageWidth + (index % boardWidth))
                    ? 'wall' // Adds the wall CSS class
                    : '' // Adds nothing if there is no wall
                } ${
                  // Checks whether this square is in our selectedCells array
                  selectedCells.includes(Math.floor(index / boardWidth) * storageWidth + (index % boardWidth))
                    ? 'selected-cell' // Adds a special class to selected squares
                    : '' // Adds nothing if the square isn't selected
                }`}
                key={index}
                onMouseDown={(event) => {
                  if (selectedTool !== 'select') return // Only works with Select
                  if (event.button !== 0) return // Only accepts left mouse clicks

                  event.preventDefault() // Prevents unwanted text selection

                  const storedIndex =
                    Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)
                    // Finds the clicked square's stored position

                  if (robots.includes(storedIndex) || walls.includes(storedIndex)) {
                    setDraggedCell(storedIndex) // Remembers the robot or wall being dragged
                    return // Stops area selection while dragging an object
                  }

                  setIsSelecting(true) // Allows highlighting multiple squares normally
                }}

                onMouseEnter={() => {
                // Only highlights squares while dragging with Select
                if (selectedTool !== 'select' || !isSelecting) return

                // Finds the square's position on the board
                const storedIndex = Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)

                // Adds the square to the highlighted selection
                setSelectedCells((previous) =>
                  previous.includes(storedIndex)
                    ? previous // Keeps it highlighted if already selected
                    : [...previous, storedIndex] // Highlights the new square
                )
              }}

              onMouseUp={() => {
                if (draggedCell === null) return // Stops if we aren't dragging an object

                // Finds the square where the mouse was released
                const targetCell =
                  Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)

                // Checks whether the destination is empty
                const isEmpty =
                  !robots.includes(targetCell) && !walls.includes(targetCell)

                if (isEmpty) {
                  // Moves the robot if the dragged object is a robot
                  setRobots((previous) =>
                    previous.map((cell) => cell === draggedCell ? targetCell : cell)
                  )

                  // Moves the wall if the dragged object is a wall
                  setWalls((previous) =>
                    previous.map((cell) => cell === draggedCell ? targetCell : cell)
                  )
                }

                if (isEmpty) {
                  setSelectedCells([targetCell]) // Highlights the robot or wall at its new position
                }

                setDraggedCell(null) // Ends the drag operation
              }}

                onClick={() => {
                  // Converts the clicked square into its stored position
                  const storedIndex = Math.floor(index / boardWidth) * storageWidth + (index % boardWidth)



                  // Checks whether the Select tool is active
                  if (selectedTool === 'select') {

                    // Updates the list of highlighted board squares
                    setSelectedCells((previous) =>

                      // Checks whether this square is already highlighted
                      previous.includes(storedIndex)

                        // If highlighted, clicking again removes it from the selection
                        ? previous.filter((cell) => cell !== storedIndex)

                        // Otherwise, adds the square to the highlighted area
                        : [...previous, storedIndex]
                    )
                  }

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

        {selectedTool === 'select' && selectedCells.length > 0 && (
          <div className="movement-controls">
            <h2>Edit Selected Objects</h2> {/* Editing controls heading */}
            <p>Move highlighted robots or walls one square at a time.</p>
          </div>
        )}

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
