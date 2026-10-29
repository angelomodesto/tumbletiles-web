import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react' // Lets the page use state and respond to keyboard controls
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
import Simulator from './Simulator'
import { initialState } from './simulatorState'
import type { Direction } from './engine'
import { addConcrete, addTile, createBoard, fromIndex, toIndex, tumble } from './engine'

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
  const [visited, setVisited] = useState(hasVisited)
  const [simulator, setSimulator] = useState(initialState)

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

  /**
   * Handles one arrow key, using whatever is on the board right now. Returns
   * whether the key was used, so the page only stops scrolling when it was.
   */
  const handleArrow = (direction: Direction): boolean => {
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



  if (showSimulator) return shell('simulator', <Simulator state={simulator} setState={setSimulator} />)

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
