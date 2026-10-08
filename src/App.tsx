import { useEffect, useState } from 'react' // Lets the page use state and respond to keyboard controls
import './App.css'
import type { Direction } from './engine'
import { addConcrete, addTile, createBoard, fromIndex, toIndex, tumble } from './engine'

function App() {
  // State
  const [showSimulator, setShowSimulator] = useState(false) // Tracks whether the simulator should be shown
  const [showTutorial, setShowTutorial] = useState(false) // Tracks whether the tutorial should be shown
  const [tutorialStep, setTutorialStep] = useState(1) // Tracks which tutorial step the user is currently on
  const [tutorialRobots, setTutorialRobots] = useState<number[]>([]) // Stores robots placed on the tutorial board
  const [tutorialWalls, setTutorialWalls] = useState<number[]>([]) // Stores walls placed on the tutorial board
  const [tutorialEraseCells, setTutorialEraseCells] = useState<number[]>([6, 12, 18]) // Stores objects that can be erased during the tutorial
  const [tutorialMoveRobot, setTutorialMoveRobot] = useState(12) // Stores the robot's position for the movement tutorial
  const [tutorialHasMoved, setTutorialHasMoved] = useState(false) // Tracks whether the user has moved the tutorial robot
  const [selectedTool, setSelectedTool] = useState('robot') // Tracks which board tool is currently selected
  const [robots, setRobots] = useState<number[]>([]) // Stores which board cells contain robots
  const [walls, setWalls] = useState<number[]>([]) // Stores which board cells contain walls
  const [boardWidth, setBoardWidth] = useState(15) // Stores the board width, starting at 15
  const [boardHeight, setBoardHeight] = useState(15) // Stores the board height, starting at 15
  const handleImport = async (file: File) => { // Handles the XML file selected by the user
  const xmlText = await file.text() // Reads the file contents as text
  const parser = new DOMParser() // Creates a parser that can read XML
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml') // Converts the text into an XML document
  const boardSize = xmlDoc.querySelector('BoardSize') // Finds the BoardSize element in the XML

  if (!boardSize) return // Stops if the XML doesn't contain a BoardSize element

  const width = Number(boardSize.getAttribute('width')) // Gets the board width from XML
  const height = Number(boardSize.getAttribute('height')) // Gets the board height from XML

  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    return // Stops if the board dimensions are invalid
  }

  setBoardWidth(width) // Updates the simulator's board width
  setBoardHeight(height) // Updates the simulator's board height

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

    const index = y * width + x // Converts X and Y into our grid's cell index

    const concrete = tile.querySelector('Concrete')?.textContent?.trim() // Reads whether the tile is concrete

    if (concrete === 'True') {
      importedWalls.push(index) // Concrete tiles are walls
    } else if (concrete === 'False') {
      importedRobots.push(index) // Non-concrete tiles are robots
    }
  }) // Ends the tiles.forEach() loop
  setRobots(importedRobots) // Places the imported robots on the board
  setWalls(importedWalls) // Places the imported walls on the board
} // Ends the handleImport function


  // Movement
  // The rules live in src/engine, so they can be tested without the interface
  // and checked against the TumbleTiles desktop application. The board uses
  // flat cell numbers, so each move rebuilds an engine board, tumbles it, and
  // reads the positions back out.
  const applyMove = (direction: Direction) => {
    const board = createBoard(boardWidth, boardHeight)

    // Walls go on first so a robot can never be placed on top of one
    walls.forEach((cell) => {
      const { x, y } = fromIndex(cell, boardWidth)
      addConcrete(board, x, y)
    })

    robots.forEach((cell) => {
      const { x, y } = fromIndex(cell, boardWidth)
      addTile(board, x, y)
    })

    tumble(board, direction)

    setRobots(
      board.polyominoes.flatMap((poly) =>
        poly.tiles.map((tile) => toIndex(tile, boardWidth)),
      ),
    )
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
          setTutorialMoveRobot((robot) => robot % 5) // Moves the tutorial robot to the top
          setTutorialHasMoved(true) // Records that the user practiced moving the robot
        }
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveDown() // Moves robots down in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          setTutorialMoveRobot((robot) => 20 + (robot % 5)) // Moves the tutorial robot to the bottom
          setTutorialHasMoved(true) // Records that the user practiced moving the robot
        }
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveLeft() // Moves robots left in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          setTutorialMoveRobot((robot) => Math.floor(robot / 5) * 5) // Moves the tutorial robot to the left edge
          setTutorialHasMoved(true) // Records that the user practiced moving the robot
        }
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault() // Prevents the page from scrolling

        if (showSimulator) {
          moveRight() // Moves robots right in the real simulator
        }

        if (showTutorial && tutorialStep === 5) {
          setTutorialMoveRobot((robot) => Math.floor(robot / 5) * 5 + 4) // Moves the tutorial robot to the right edge
          setTutorialHasMoved(true) // Records that the user practiced moving the robot
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown) // Starts listening for key presses

    return () => {
      window.removeEventListener('keydown', handleKeyDown) // Stops listening when no longer needed
    }
  }, [showSimulator, showTutorial, tutorialStep, robots, walls])



// Tutorial page
if (showTutorial) {
  return (
    <div className="tutorial-page"> {/* Main tutorial page */}

      <button
        type="button"
        onClick={() => {
          setTutorialStep(1) // Resets the tutorial back to step 1
          setTutorialRobots([]) // Removes all robots placed during the tutorial
          setTutorialWalls([]) // Removes all walls placed during the tutorial
          setTutorialEraseCells([6, 12, 18]) // Restores the objects for the erase tutorial
          setTutorialMoveRobot(12) // Puts the movement robot back in the center
          setTutorialHasMoved(false) // Resets whether the movement step has been completed
          setShowTutorial(false) // Returns to the home page
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
              Select the Wall tool and click an empty square on the board to place a wall.
            </p>

            <div className="tutorial-tools"> {/* Practice toolbar used during the tutorial */}
              <span>[ TOOLS ]</span>

              <button type="button">
                Robot
              </button>

              <button type="button" className="active-tool">
                Wall
              </button>

              <button type="button">
                Erase
              </button>
            </div>

            <div className="tutorial-board"> {/* Holds the small practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialWalls.includes(index) ? 'wall' : ''}`} // Shows a wall when the cell is selected
                  onClick={() => {
                    if (!tutorialWalls.includes(index)) {
                      setTutorialWalls([...tutorialWalls, index]) // Places a wall on the clicked tutorial cell
                    }
                  }}
                ></div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTutorialStep(1)} /* Returns to tutorial step 1 */
            >
              ← Back
            </button>
            
            
            {tutorialWalls.length > 0 && (
              <button
                type="button"
                onClick={() => setTutorialStep(3)} /* Moves to tutorial step 3 */
              >
                Next →
              </button>
            )}

            </div>
        )}

        {tutorialStep === 3 && (
          <div> {/* Shows the robot instructions only during step 3 */}

            <h2>Step 3: Place a Robot</h2>

            <p>
              Select the Robot tool and click an empty square on the board to place a robot.
            </p>


            <div className="tutorial-tools"> {/* Practice toolbar used during the tutorial */}
              <span>[ TOOLS ]</span>

              <button type="button" className="active-tool">
                Robot
              </button>

              <button type="button">
                Wall
              </button>

              <button type="button">
                Erase
              </button>
            </div>


            <div className="tutorial-board"> {/* Holds the robot practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialRobots.includes(index) ? 'robot' : ''}`} // Shows a robot when selected
                  onClick={() => {
                    if (!tutorialRobots.includes(index)) {
                      setTutorialRobots([...tutorialRobots, index]) // Places a robot on the clicked tutorial cell
                    }
                  }}
                ></div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTutorialStep(2)} /* Returns to tutorial step 2 */
            >
              ← Back
            </button>

            {tutorialRobots.length > 0 && (
              <button
                type="button"
                onClick={() => setTutorialStep(4)} /* Moves to tutorial step 4 */
              >
                Next →
              </button>
            )}

          </div>
        )}

        {tutorialStep === 4 && (
          <div> {/* Shows the erase instructions only during step 4 */}

            <h2>Step 4: Use Erase</h2>

            <p>
              Select the Erase tool and click a robot or wall to remove it from the board.
            </p>

            <div className="tutorial-tools"> {/* Practice toolbar used during the tutorial */}
              <span>[ TOOLS ]</span>

              <button type="button">
                Robot
              </button>

              <button type="button">
                Wall
              </button>

              <button type="button" className="active-tool">
                Erase
              </button>
            </div>

            <div className="tutorial-board"> {/* Holds the erase practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialEraseCells.includes(index) ? 'robot' : ''}`} /* Shows objects that can be erased */
                  onClick={() => {
                    if (tutorialEraseCells.includes(index)) {
                      setTutorialEraseCells(
                        tutorialEraseCells.filter((cell) => cell !== index)
                      ) // Removes the clicked object from the tutorial board
                    }
                  }}
                ></div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTutorialStep(3)} /* Returns to tutorial step 3 */
            >
              ← Back
            </button>

            {tutorialEraseCells.length < 3 && (
              <button
                type="button"
                onClick={() => setTutorialStep(5)} /* Moves to tutorial step 5 */
              >
                Next →
              </button>
            )}

          </div>
        )}


        {tutorialStep === 5 && (
          <div> {/* Shows the movement instructions only during step 5 */}

            <h2>Step 5: Move the Robots</h2>

            <p>
              Use the movement buttons or the keyboard arrow keys to move the robots up, down, left, or right.
              Robots will keep moving until they reach the edge of the board, a wall, or another robot.
            </p>

            <div className="tutorial-board"> {/* Holds the movement practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialMoveRobot === index ? 'robot' : ''}`} /* Shows the robot at its current position */
                ></div>
              ))}
            </div>

            <div className="tutorial-movement"> {/* Holds the tutorial movement buttons */}

              <button
                type="button"
                 onClick={() => {
                  setTutorialMoveRobot(tutorialMoveRobot % 5) // Moves the robot to the top of its current column
                  setTutorialHasMoved(true) // Records that the user practiced moving the robot
                }}
              >
                ↑
              </button>

              <button
                type="button"
                onClick={() => {
                  setTutorialMoveRobot(Math.floor(tutorialMoveRobot / 5) * 5) // Moves the robot to the left edge of its current row
                  setTutorialHasMoved(true) // Records that the user practiced moving the robot
                }}
              >
                ←
              </button>

              <button
                type="button"
                onClick={() => {
                  setTutorialMoveRobot(20 + (tutorialMoveRobot % 5)) // Moves the robot to the bottom of its current column
                  setTutorialHasMoved(true) // Records that the user practiced moving the robot
                }}
              >
                ↓
              </button>

              <button
                type="button"
                 onClick={() => {
                  setTutorialMoveRobot(Math.floor(tutorialMoveRobot / 5) * 5 + 4) // Moves the robot to the right edge of its current row
                  setTutorialHasMoved(true) // Records that the user practiced moving the robot
                }}
              >
                →
              </button>

            </div>

            <button
              type="button"
              onClick={() => setTutorialStep(4)} /* Returns to tutorial step 4 */
            >
              ← Back
            </button>

            {tutorialHasMoved && (
              <button
                type="button"
                onClick={() => setTutorialStep(6)} /* Moves to tutorial step 6 */
              >
                Next →
              </button>
            )}

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
              onClick={() => setTutorialStep(5)} /* Returns to tutorial step 5 */
            >
              ← Back
            </button>

            <button
              type="button"
              onClick={() => {
                setTutorialStep(1) // Resets the tutorial back to step 1
                setTutorialRobots([]) // Removes all robots placed during the tutorial
                setTutorialWalls([]) // Removes all walls placed during the tutorial
                setTutorialEraseCells([6, 12, 18]) // Restores the objects for the erase tutorial
                setTutorialMoveRobot(12) // Puts the movement robot back in the center
                setTutorialHasMoved(false) // Resets whether the movement step has been completed
                setShowTutorial(false) // Returns to the home page
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
          
        </div> {/* End of Tools */}



        <div className="board-settings"> {/* Holds settings for the simulator board */}
          <h2>Board Settings</h2> {/* Board settings title */}

          <label>
            Width:
            <input
              type="number"
              value={boardWidth}
              onChange={(event) => setBoardWidth(Number(event.target.value))}
            />
          </label>

          <label>
            Height:
            <input
              type="number"
              value={boardHeight}
              onChange={(event) => setBoardHeight(Number(event.target.value))}
            />
          </label>


          <button
            type="button"
            onClick={() => {
              setRobots([]) // Removes all robots from the board
              setWalls([]) // Removes all walls from the board
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
              gridTemplateColumns: `repeat(${boardWidth}, 30px)`,
              gridTemplateRows: `repeat(${boardHeight}, 30px)`
            }} /* Changes the grid size based on the selected width and height */
          > 
            {Array.from({ length:  boardWidth * boardHeight }).map((_, index) => (
              <div 
                className={`board-cell ${robots.includes(index) ? 'robot' : ''} ${walls.includes(index) ? 'wall' : ''}`} /* Adds robot or wall style to the cell */
                key={index}
                onClick={() => {
                  if (selectedTool === 'robot' && !robots.includes(index) && !walls.includes(index)) {
                    setRobots([...robots, index]) // Places a robot only if the cell is empty
                  }

                  if (selectedTool === 'wall' && !walls.includes(index) && !robots.includes(index)) {
                    setWalls([...walls, index]) // Places a wall only if the cell is empty
                  }

                  if (selectedTool === 'erase') {
                    setRobots(robots.filter((robot) => robot !== index)) // Removes a robot from the clicked cell
                    setWalls(walls.filter((wall) => wall !== index)) // Removes a wall from the clicked cell
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
            onClick={() => setShowTutorial(true)} /* Opens the tutorial when clicked */
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
