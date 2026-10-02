import { useEffect, useState } from 'react' // Lets the page use state and respond to keyboard controls
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

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


  // Movement function
  const moveUp = () => { // Moves all robots upward
    const sortedRobots = [...robots].sort((a, b) => a - b) // Processes the top robots first
    const newRobots: number[] = [] // Stores each robot's new position

    sortedRobots.forEach((robot) => { // Goes through each robot
      let newPosition = robot // Starts at the robot's current position

      while (
        newPosition >= boardWidth &&
        !walls.includes(newPosition - boardWidth) &&
        !newRobots.includes(newPosition - boardWidth)
      ) {
        newPosition -= boardWidth // Moves the robot up one row based on the board width
      }

      newRobots.push(newPosition) // Saves the robot's final position
    })

    setRobots(newRobots) // Updates the board with the new robot positions
  }


  const moveDown = () => { // Moves all robots downward
    const sortedRobots = [...robots].sort((a, b) => b - a) // Processes the bottom robots first
    const newRobots: number[] = [] // Stores each robot's new position

    sortedRobots.forEach((robot) => { // Goes through each robot
      let newPosition = robot // Starts at the robot's current position

      while (
        newPosition < boardWidth * (boardHeight - 1) &&
        !walls.includes(newPosition + boardWidth) &&
        !newRobots.includes(newPosition + boardWidth)
      ) {
        newPosition += boardWidth // Moves the robot down one row based on the board width
      }

      newRobots.push(newPosition) // Saves the robot's final position
    })

    setRobots(newRobots) // Updates the board with the new robot positions
  }


  const moveLeft = () => { // Moves all robots to the left
    const sortedRobots = [...robots].sort((a, b) => a - b) // Processes the left robots first
    const newRobots: number[] = [] // Stores each robot's new position

    sortedRobots.forEach((robot) => { // Goes through each robot
      let newPosition = robot // Starts at the robot's current position

      while (
        newPosition % boardWidth !== 0 &&
        !walls.includes(newPosition - 1) &&
        !newRobots.includes(newPosition - 1)
      ) {
        newPosition -= 1 // Moves the robot one cell to the left
      }

      newRobots.push(newPosition) // Saves the robot's final position
    })

    setRobots(newRobots) // Updates the board with the new robot positions
  }


  const moveRight = () => { // Moves all robots to the right
    const sortedRobots = [...robots].sort((a, b) => b - a) // Processes the right robots first
    const newRobots: number[] = [] // Stores each robot's new position

    sortedRobots.forEach((robot) => { // Goes through each robot
      let newPosition = robot // Starts at the robot's current position

      while (
        newPosition % boardWidth !== boardWidth - 1 &&
        !walls.includes(newPosition + 1) &&
        !newRobots.includes(newPosition + 1)
      ) {
        newPosition += 1 // Moves the robot one cell to the right
      }

      newRobots.push(newPosition) // Saves the robot's final position
    })

    setRobots(newRobots) // Updates the board with the new robot positions
  }


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
          <div> {/* Shows the robot instructions only during step 2 */}

            <h2>Step 2: Place a Robot</h2>

            <p>
              Select the Robot tool and click an empty square on the board to place a robot.
            </p>

            <div className="tutorial-board"> {/* Holds the small practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialRobots.includes(index) ? 'robot' : ''}`} /* Shows a robot when the cell is selected */
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
              onClick={() => setTutorialStep(1)} /* Returns to tutorial step 1 */
            >
              ← Back
            </button>
            
            
            {tutorialRobots.length > 0 && (
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
          <div> {/* Shows the wall instructions only during step 3 */}

            <h2>Step 3: Place a Wall</h2>

            <p>
              Select the Wall tool and click an empty square on the board to place a wall.
            </p>


            <div className="tutorial-board"> {/* Holds the wall practice board */}
              {Array.from({ length: 25 }).map((_, index) => (
                <div
                  key={index}
                  className={`tutorial-cell ${tutorialWalls.includes(index) ? 'wall' : ''}`} /* Shows a wall when the cell is selected */
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
              onClick={() => setTutorialStep(2)} /* Returns to tutorial step 2 */
            >
              ← Back
            </button>

            {tutorialWalls.length > 0 && (
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

            {tutorialEraseCells.length === 0 && (
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
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
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

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
