import { useState } from 'react' // Lets the page remember which screen should be shown
import heroImg from './assets/hero.png'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import './App.css'

function App() {
  const [showSimulator, setShowSimulator] = useState(false) // Tracks whether the simulator should be shown
  const [selectedCells, setSelectedCells] = useState<number[]>([]) // Stores the board cells that have been selected
  const [selectedTool, setSelectedTool] = useState('robot') // Tracks which board tool is currently selected
  const [robots, setRobots] = useState<number[]>([]) // Stores which board cells contain robots

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
                className={`board-cell ${selectedCells.includes(index) ? 'selected' : ''}`} /* Adds selected style if the cell was clicked */
                key={index}
                onClick={() => {
                  if (selectedTool === 'robot') {
                    setRobots([...robots, index]) // Places a robot in the clicked cell
                  }
                }}
              ></div> /* Creates one square for the board */
            ))}
          </div>
        </div> {/* Closes the simulator board */}
 
      </div> 
    )
  }


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
