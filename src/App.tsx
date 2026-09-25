import { useEffect, useState } from 'react' // Lets the page use state and respond to keyboard controls
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  // State
  const [showSimulator, setShowSimulator] = useState(false) // Tracks whether the simulator should be shown
  const [selectedCells, setSelectedCells] = useState<number[]>([]) // Stores the board cells that have been selected
  const [selectedTool, setSelectedTool] = useState('robot') // Tracks which board tool is currently selected
  const [robots, setRobots] = useState<number[]>([]) // Stores which board cells contain robots
  const [walls, setWalls] = useState<number[]>([]) // Stores which board cells contain walls


  // Movement function
  const moveUp = () => { // Moves all robots upward
    const sortedRobots = [...robots].sort((a, b) => a - b) // Processes the top robots first
    const newRobots: number[] = [] // Stores each robot's new position

    sortedRobots.forEach((robot) => { // Goes through each robot
      let newPosition = robot // Starts at the robot's current position

      while (
        newPosition >= 15 &&
        !walls.includes(newPosition - 15) &&
        !newRobots.includes(newPosition - 15)
      ) {
        newPosition -= 15 // Moves the robot up one row
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
        newPosition < 210 &&
        !walls.includes(newPosition + 15) &&
        !newRobots.includes(newPosition + 15)
      ) {
        newPosition += 15 // Moves the robot down one row
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
        newPosition % 15 !== 0 &&
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
        newPosition % 15 !== 14 &&
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
      if (!showSimulator) return // Only uses arrow keys while the simulator is open

      if (event.key === 'ArrowUp') {
        event.preventDefault() // Prevents the page from scrolling
        moveUp() // Moves robots up
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault() // Prevents the page from scrolling
        moveDown() // Moves robots down
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault() // Prevents the page from scrolling
        moveLeft() // Moves robots left
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault() // Prevents the page from scrolling
        moveRight() // Moves robots right
      }
    }

    window.addEventListener('keydown', handleKeyDown) // Starts listening for key presses

    return () => {
      window.removeEventListener('keydown', handleKeyDown) // Stops listening when no longer needed
    }
  }, [showSimulator, robots, walls])

  // Simulator page
  if (showSimulator) {
    return (
      <div className="simulator-page"> {/* Main simulator page */}
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
        </div>

        <div className="simulator-board"> {/* Holds the Tumble Tiles board */} 
          <h2>Board</h2> {/* Board section title */} 
 
          <div className="board-grid"> {/* Holds the squares that make up the board */} 
            {Array.from({ length: 225 }).map((_, index) => (
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
