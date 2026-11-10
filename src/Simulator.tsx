import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, PointerEvent, SetStateAction } from 'react'
import type { Direction } from './engine'
import type { RobotType } from './engine/types'
import { MAX_BOARD_SIZE, parseConfiguration } from './engine/xml'
import type { Configuration } from './engine/xml'
import { cellSizeFor } from './boardLayout'



import {
  allTiles, assignType, exportState, fillCells, initialState, loadState,
  moveSelectedTiles, moveState, place, pasteTiles, recordHistory, removeTiles, resize, selectCells,
  selectRegion, setTypes
} from './simulatorState'


import type { SimulatorState } from './simulatorState'
import PresetGallery from './PresetGallery'
import TypeAppearanceEditor from './TypeAppearanceEditor'
import './Simulator.css'

type Tool = 'robot' | 'wall' | 'erase' | 'select' | 'pan'
const arrows: [Direction, string, string][] = [['N', '↑', 'up'], ['W', '←', 'left'], ['S', '↓', 'down'], ['E', '→', 'right']]
const keys: Record<string, Direction> = { ArrowUp: 'N', ArrowLeft: 'W', ArrowDown: 'S', ArrowRight: 'E' }
const toolKeys: Record<string, Tool> = { r: 'robot', w: 'wall', e: 'erase', v: 'select', h: 'pan' }
export default function Simulator({ state, setState }: { state: SimulatorState; setState: Dispatch<SetStateAction<SimulatorState>> }) {
  const [tool, setTool] = useState<Tool>('robot')
  const [typeId, setTypeId] = useState(state.board.robotTypes?.[0]?.id ?? 'default')
  const [selection, setSelection] = useState<number[]>([])
  const [selectedCells, setSelectedCells] = useState<number[]>([]) // Stores highlighted board squares, including empty ones
  const [copiedTiles, setCopiedTiles] = useState<typeof tiles>([]) // Stores copies of selected robots and walls
  const [isPasting, setIsPasting] = useState(false) // Tracks whether the user is choosing where to paste
  const [isMoving, setIsMoving] = useState(false) // Tracks whether the user is choosing where to move selected tiles
  // Ids, not copies: a tilt during Move Mode moves the pieces, and the move should follow them.
  const [movingIds, setMovingIds] = useState<number[]>([]) // The robots and walls chosen for moving
  const [hover, setHover] = useState<null | { x: number; y: number }>(null) // Square under the pointer while placing
  const [history, setHistory] = useState<SimulatorState[]>([])
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(1)
  const [panelSize, setPanelSize] = useState({ width: 550, height: 520 })
  const [shortcuts, setShortcuts] = useState(false)
  const [library, setLibrary] = useState(false)
  const [width, setWidth] = useState(String(state.board.cols))
  const [height, setHeight] = useState(String(state.board.rows))
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState('#3578d4')
  const panel = useRef<HTMLDivElement>(null)
  const grid = useRef<HTMLDivElement>(null)
  const message = useRef<HTMLParagraphElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const libraryButton = useRef<HTMLButtonElement>(null)
  const drag = useRef<null | { start: { x: number; y: number }; base: number[]; baseCells: number[]; pan: boolean; clientX: number; clientY: number; left: number; top: number }>(null)
  const [region, setRegion] = useState<null | { x: number; y: number; width: number; height: number }>(null)
  const types = state.board.robotTypes ?? []
  const activeType = types.find((t) => t.id === typeId) ?? types[0]
  const tiles = allTiles(state.board)
  const cells = new Map(tiles.map((tile) => [tile.y * state.board.cols + tile.x, tile]))
  const selected = new Set(selection)
  const tilesToCopy = tiles.filter((tile) => selected.has(tile.id)) // Keeps only robots and walls that are selected
  const tilesToMove = tiles.filter((tile) => movingIds.includes(tile.id)) // Where those pieces are now
  const placing = isPasting || isMoving // Paste or Move Mode: the next board click places the group
  const highlightedCells = new Set(selectedCells) // NEW: Tracks highlighted board positions
  const emptySelected = selectedCells.filter((index) => !cells.has(index)).length // Highlighted squares a fill would use
  const baseSize = cellSizeFor(state.board.cols, state.board.rows, panelSize.width, panelSize.height)
  const cellSize = baseSize * zoom

  function edit(action: (current: SimulatorState) => SimulatorState) {
    try {
      const next = action(state)
      if (next === state) { setError(''); return }
      setHistory((items) => recordHistory(items, state, next))
      setState(next)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the board.') }
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setState(previous)
    setWidth(String(previous.board.cols)); setHeight(String(previous.board.rows))
    setHistory((items) => items.slice(0, -1)) // Removes the last history entry
    setSelection([]) // Clears selected robots and walls
    setSelectedCells([]) // Clears highlighted board squares
    setError('') // Clears error messages
  }
  function move(direction: Direction) {
    edit((current) => moveState(current, direction)) // Moves the robots
    setSelectedCells([]) // Squares are positions, so they no longer match the robots that moved
  }

  // Fills every highlighted empty square in one undoable step.
  function fillSelectedCells(fillWith: 'robot' | 'wall') {
    edit((current) => fillCells(current, selectedCells, fillWith, activeType?.id ?? ''))
    setSelectedCells([]) // Clears the highlighted squares afterward
    setSelection([]) // Clears the existing tile selection
  }

  // Buttons and keyboard shortcuts both switch tools here, so leaving Select
  // always clears the selection the same way.
  function chooseTool(name: Tool) {
    if (name !== 'select') {
      setSelectedCells([]) // Removes the highlighted squares
      setSelection([]) // Clears selected robots and walls
    }
    endPlacing() // Switching tools cancels Paste Mode and Move Mode
    setTool(name)
  }

  function clearSelection() {
    setSelection([]) // Clears selected robots and walls
    setSelectedCells([]) // Clears highlighted squares
  }

  // Leaves Paste or Move Mode, so board clicks go back to the current tool.
  function endPlacing() {
    setIsPasting(false)
    setIsMoving(false)
    setMovingIds([])
    setHover(null)
  }

  // The Paste button and Ctrl/Cmd+V both start here; pasting happens in the Select panel.
  function startPasting() {
    if (copiedTiles.length === 0) return
    clearSelection() // Removes the selection outlines so the preview reads clearly
    setMovingIds([])
    setIsMoving(false)
    setTool('select')
    setIsPasting(true)
  }

  function startMoving() {
    if (tilesToCopy.length === 0) return
    setMovingIds(tilesToCopy.map((tile) => tile.id))
    setIsPasting(false)
    setHover(null)
    setIsMoving(true)
  }

  
  function movingOrigin() {
    if (tilesToMove.length === 0) return null // Stops if no tiles were selected for moving

    return {
      x: Math.min(...tilesToMove.map((tile) => tile.x)), // Finds the leftmost selected tile
      y: Math.min(...tilesToMove.map((tile) => tile.y)) // Finds the highest selected tile
    }
  }

  
  function getMovePositions(x: number, y: number) {
    const origin = movingOrigin() // Finds the original top-left position

    if (!origin) return [] // Stops if no tiles were selected

    return tilesToMove.map((tile) => ({
      ...tile, // Keeps the tile's existing properties
      x: x + (tile.x - origin.x), // Calculates the new column
      y: y + (tile.y - origin.y) // Calculates the new row
    }))
  }

  
  function canMoveAt(x: number, y: number) {
    const positions = getMovePositions(x, y) // Calculates where the selected tiles would move

    if (positions.length === 0) return false // Stops if nothing is selected

    return positions.every((tile) => {
      const insideBoard =
        tile.x >= 0 && tile.x < state.board.cols && // Checks the left and right boundaries
        tile.y >= 0 && tile.y < state.board.rows // Checks the top and bottom boundaries

      const existingTile = cells.get(tile.y * state.board.cols + tile.x) // Finds any tile at the destination
      const spaceAvailable = !existingTile || tilesToMove.some((moving) => moving.id === existingTile.id) // Allows empty squares or squares occupied by the moving group

      return insideBoard && spaceAvailable // Every destination square must be valid
    })
  }




  function copiedOrigin() {
    if (copiedTiles.length === 0) return null // Stops when nothing has been copied

    return {
      x: Math.min(...copiedTiles.map((tile) => tile.x)), // Finds the leftmost copied tile
      y: Math.min(...copiedTiles.map((tile) => tile.y)) // Finds the topmost copied tile
    }
  }


  
  function getPastePositions(x: number, y: number) {
    const origin = copiedOrigin() // Finds the copied group's original starting position

    if (!origin) return [] // Stops if nothing has been copied

    return copiedTiles.map((tile) => ({
      ...tile, // Keeps the robot or wall's original properties
      x: x + (tile.x - origin.x), // Calculates its new column
      y: y + (tile.y - origin.y) // Calculates its new row
    }))
  }

  
  function canPasteAt(x: number, y: number) {
    const positions = getPastePositions(x, y) // Calculates the destination squares

    if (positions.length === 0) return false // Nothing copied

    return positions.every((tile) => {
      const insideBoard =
        tile.x >= 0 && tile.x < state.board.cols && // Checks horizontal boundaries
        tile.y >= 0 && tile.y < state.board.rows // Checks vertical boundaries

      const squareIsEmpty =
        !cells.has(tile.y * state.board.cols + tile.x) // Checks for existing tiles

      return insideBoard && squareIsEmpty // Every destination must be valid
    })
  }


  
  function copySelection() {
    if (tilesToCopy.length === 0) return // Stops if nothing is selected

    setCopiedTiles(
      structuredClone(tilesToCopy) // Saves independent copies of the selected robots and walls
    )

    setError('') // Clears previous error messages
  }



  function load(config: Configuration) {
    edit(() => loadState(config))
    setTypeId(config.robotTypes?.[0]?.id ?? 'default')
    setSelection([]) // Clears selected robots and walls
    setSelectedCells([]) // Clears highlighted board squares
    setWidth(String(config.cols))
    setHeight(String(config.rows))
    fit()
    setLibrary(false)
  }
  function fit() {
    setZoom(1)
    if (panel.current) { panel.current.scrollLeft = 0; panel.current.scrollTop = 0 }
  }
  function changeZoom(value: number) { setZoom(Math.max(0.5, Math.min(4, value))) }
  function updateType(type: RobotType) {
    edit((current) => setTypes(current, types.map((t) => t.id === type.id ? type : t), current.board.stickingRules ?? []))
  }
  function cellAt(event: PointerEvent): { x: number; y: number } {
    const rect = grid.current!.getBoundingClientRect()
    return { x: Math.max(0, Math.min(state.board.cols - 1, Math.floor((event.clientX - rect.left) / cellSize))),
      y: Math.max(0, Math.min(state.board.rows - 1, Math.floor((event.clientY - rect.top) / cellSize))) }
  }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    
  if (isPasting || isMoving) return // Prevents dragging while Paste Mode or Move Mode is active
    if (event.button !== 0 && event.button !== 1) return
    const pan = tool === 'pan' || event.button === 1
    if (!pan && tool !== 'select') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    // Shift keeps what was selected when the drag began; the rectangle is added to that.
    drag.current = { start: cellAt(event), base: event.shiftKey ? selection : [], baseCells: event.shiftKey ? selectedCells : [], pan,
      clientX: event.clientX, clientY: event.clientY, left: panel.current!.scrollLeft, top: panel.current!.scrollTop }

    if (!pan) {
      const start = drag.current.start // Gets the square where the mouse was pressed
      setSelection([...new Set([...drag.current.base, ...selectRegion(state.board, start, start)])])
      setSelectedCells([...new Set([...drag.current.baseCells, ...selectCells(state.board, start, start)])])
    }
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    if (placing) { setHover(cellAt(event)); return } // The preview follows the pointer
    const current = drag.current
    if (!current) return
    if (current.pan) {
      panel.current!.scrollLeft = current.left - event.clientX + current.clientX
      panel.current!.scrollTop = current.top - event.clientY + current.clientY
    } else {
      const end = cellAt(event) // Gets the square currently under the mouse
      setRegion({
        x: Math.min(end.x, current.start.x), // Left edge
        y: Math.min(end.y, current.start.y), // Top edge
        width: Math.abs(end.x - current.start.x) + 1, // Rectangle width
        height: Math.abs(end.y - current.start.y) + 1 // Rectangle height
      })
      // Both start again from the snapshot, so dragging back in shrinks the selection.
      setSelection([...new Set([...current.base, ...selectRegion(state.board, current.start, end)])])
      setSelectedCells([...new Set([...current.baseCells, ...selectCells(state.board, current.start, end)])])
    }
  }


  function clickCell(x: number, y: number, shift = false) {


    if (isMoving) { // Checks whether Move Mode is active
    if (!canMoveAt(x, y)) { // Checks whether the selected tiles fit at the destination
      setError('Cannot move here. The area is occupied or outside the board.') // Shows why the move is invalid
      return // Stops the move without changing the board
    }

    
    edit((current) => moveSelectedTiles(
      current, // Uses the current simulator state
      tilesToMove.map((tile) => tile.id), // Gets the IDs of the selected robots and walls
      getMovePositions(x, y) // Calculates their new positions
    ))

    endPlacing() // Exits Move Mode after moving
    clearSelection() // Clears the selected robots, walls and highlighted squares
    return // Stops clickCell from running the normal selection logic
  }

    if (isPasting) {
      if (!canPasteAt(x, y)) { // Checks whether the copied group fits
        setError('Cannot paste here. The area is occupied or outside the board.') // Explains why pasting failed
        return // Stops an invalid paste
      }
      edit((current) => pasteTiles(current, getPastePositions(x, y))) // Places copied tiles at the clicked position
      endPlacing() // Exits Paste Mode after placing the tiles
      return
    }


    if (tool === 'pan') return
    if (tool === 'select') {
      const tile = cells.get(y * state.board.cols + x)
      if (!tile) { if (!shift) setSelection([]); return }
      setSelection(shift ? selection.includes(tile.id) ? selection.filter((id) => id !== tile.id) : [...selection, tile.id] : [tile.id])
    } else edit((current) => place(current, x, y, tool, activeType?.id ?? ''))
  }

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (!panel.current || !grid.current || !message.current) return
      const panelStyle = getComputedStyle(panel.current)
      const gridStyle = getComputedStyle(grid.current)
      const messageStyle = getComputedStyle(message.current)
      // contentRect excludes panel padding/borders. Reserve the grid border and
      // the message's full height, margins and flex gap before sizing cells.
      setPanelSize({
        width: Math.max(0, entry.contentRect.width - parseFloat(gridStyle.borderLeftWidth) - parseFloat(gridStyle.borderRightWidth)),
        height: Math.max(0, entry.contentRect.height - message.current.getBoundingClientRect().height
          - parseFloat(messageStyle.marginTop) - parseFloat(messageStyle.marginBottom) - parseFloat(panelStyle.rowGap)
          - parseFloat(gridStyle.borderTopWidth) - parseFloat(gridStyle.borderBottomWidth)),
      })
    })
    if (panel.current) observer.observe(panel.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (library) dialog.current?.showModal()
    else if (dialog.current?.open) { dialog.current.close(); libraryButton.current?.focus() }
  }, [library])
  // Reattach with current state so shortcuts and clicks use the same transition path.
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const inField = target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)
      // Ctrl/Cmd+C copies the selected pieces and Ctrl/Cmd+V starts pasting them. Typing in a
      // field, or copying text selected on the page, is left to the browser.
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !library && !inField && !window.getSelection()?.toString()) {
        const key = event.key.toLowerCase()
        if (key === 'c' && tilesToCopy.length) { event.preventDefault(); copySelection(); return }
        if (key === 'v' && copiedTiles.length) { event.preventDefault(); startPasting(); return }
      }
      if (library || event.ctrlKey || event.metaKey || event.altKey || inField) return
      if (keys[event.key]) { event.preventDefault(); move(keys[event.key]); return }
      if (toolKeys[event.key.toLowerCase()]) { event.preventDefault(); chooseTool(toolKeys[event.key.toLowerCase()]); return }
      if (event.key === '?') setShortcuts((value) => !value)
      if (event.key === 'Escape') {
        clearSelection() // Clears selected robots, walls, and highlighted squares
        endPlacing() // Cancels Paste Mode and Move Mode
      }
      if ((event.key === 'Delete' || event.key === 'Backspace') && selection.length) {
        event.preventDefault(); edit((current) => removeTiles(current, selection)); clearSelection()
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  })

  // Where the group would land if the square under the pointer were clicked, and whether it fits.
  const previewPositions = placing && hover ? (isMoving ? getMovePositions(hover.x, hover.y) : getPastePositions(hover.x, hover.y)) : []
  const previewFits = placing && hover !== null && (isMoving ? canMoveAt(hover.x, hover.y) : canPasteAt(hover.x, hover.y))
  const previewCells = new Set(previewPositions
    .filter((tile) => tile.x >= 0 && tile.y >= 0 && tile.x < state.board.cols && tile.y < state.board.rows)
    .map((tile) => tile.y * state.board.cols + tile.x))

  return <div className="simulator-page simulator-editor">
    <h1>Tumble Tiles Simulator</h1>
    <div className="simulator-layout">
      <aside className="simulator-controls">
        <section className="control-panel">
          <h2>Commands</h2>
          <div className="arrow-pad">{arrows.map(([direction, glyph, name]) => <button type="button" key={direction}
            title={`Move all robots ${name} (${glyph})`} aria-label={`Move all robots ${name}`} onClick={() => move(direction)}>{glyph}</button>)}</div>
          <p className="control-hint">Arrow keys work too.</p>
        </section>
        <section className="control-panel">
          <h2>Tools</h2>
          <div className="control-row">{(['robot', 'wall', 'erase', 'select', 'pan'] as Tool[]).map((name) => <button type="button" key={name}
            aria-pressed={tool === name} className={tool === name ? 'active-tool' : ''} onClick={() => chooseTool(name)}>{name}</button>)}</div>
          {tool === 'select' && <>
            {/* Same two-line slot in every mode, so switching modes never moves the panels below. */}
            <p className="control-hint">{isPasting ? 'Click a square to paste the group. Esc cancels.'
              : isMoving ? 'Click a square to move the group. Esc cancels.'
              : 'Drag a rectangle. Shift adds to selection.'}</p>
            {/* Counts get a short line of their own, so no number is long enough to wrap and move what is below. */}
            <p className="control-hint">{selection.length} selected, {emptySelected} empty</p>
            <div className="control-row">
              
              <button
                type="button"
                disabled={!selection.length} // Disables Copy when no tiles are selected
                onClick={copySelection} // Saves the selected robots and walls
              >
                Copy
              </button>

              
              <button
                type="button"
                className={isPasting ? 'active-tool' : ''} // Highlights Paste while Paste Mode is active
                disabled={copiedTiles.length === 0} // Disables Paste until something has been copied
                onClick={startPasting} // Activates Paste Mode
              >
                Paste
              </button> 

              
              <button
                type="button" // Makes this a regular button
                className={isMoving ? 'active-tool' : ''} // Highlights Move Mode when active
                disabled={selection.length === 0} // Requires at least one selected robot or wall
                onClick={startMoving} // Activates Move Mode
              >
                Move
              </button>



              <button disabled={!selection.length} onClick={() => { edit((s) => removeTiles(s, selection)); clearSelection() }}>Delete selected</button>
              <button disabled={!selection.length || !activeType} onClick={() => edit((s) => assignType(s, selection, activeType!.id))}>Apply type</button>
              <button disabled={!selection.length} onClick={() => edit((s) => assignType(s, selection))}>Use glues</button>
              <button disabled={!emptySelected || !activeType} onClick={() => fillSelectedCells('robot')}>Fill with robots</button>
              <button disabled={!emptySelected} onClick={() => fillSelectedCells('wall')}>Fill with walls</button>
              <button disabled={!selection.length && !selectedCells.length} onClick={clearSelection}>Deselect</button></div>
          </>}
          {tool === 'pan' && <p className="control-hint">Drag the board to pan. Zoom in for more room.</p>}
        </section>
        <section className="control-panel">
          <h2>Robot types</h2>
          <label className="field-label">Placement type<select aria-label="Placement type" value={activeType?.id ?? ''} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select></label>
          {activeType && <details className="type-editor"><summary>Edit type & sticking</summary>
            <TypeAppearanceEditor key={`${activeType.id}:${activeType.label}:${activeType.color}`} type={activeType} onCommit={updateType} />
            <p className="control-hint">Sticks to (both directions):</p>
            {types.map((type) => <label className="rule-option" key={type.id}><input type="checkbox"
              checked={(state.board.stickingRules ?? []).some(([a, b]) => (a === activeType.id && b === type.id) || (b === activeType.id && a === type.id))}
              onChange={(e) => {
                const rules = (state.board.stickingRules ?? []).filter(([a, b]) => !((a === activeType.id && b === type.id) || (b === activeType.id && a === type.id)))
                if (e.target.checked) rules.push([activeType.id, type.id])
                edit((s) => setTypes(s, types, rules))
              }} />{type.label}{type.id === activeType.id ? ' (itself)' : ''}</label>)}
            <p className="control-hint">When both robots have types, these rules replace side glues. Otherwise matching side glues apply. Assigning a type keeps glue labels; Use glues restores them. Changing rules or types rebuilds bonds.</p>
          </details>}
          <details><summary>Add a type</summary><form className="type-form" onSubmit={(e) => {
            e.preventDefault()
            const label = newLabel.trim()
            if (!label) return
            if (types.some((t) => t.label.toLowerCase() === label.toLowerCase())) { setError('Choose a different type label.'); return }
            const id = crypto.randomUUID()
            edit((s) => setTypes(s, [...types, { id, label, color: newColor }], s.board.stickingRules ?? []))
            setTypeId(id); setNewLabel('')
          }}>
            <label className="field-label">Label<input aria-label="New type label" required maxLength={60} value={newLabel} onChange={(e) => setNewLabel(e.target.value)} /></label>
            <label className="field-label">Color<input aria-label="New type color" type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} /></label>
            <button type="submit">Add type</button>
          </form></details>
        </section>
        <section className="control-panel">
          <h2>Configurations</h2>
          <button ref={libraryButton} onClick={() => setLibrary(true)}>Browse configurations</button>
          <div className="control-row"><label className="import-button">Import XML<input type="file" accept=".xml" className="file-input" aria-label="Import XML"
            onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = ''
              if (!file) return
              try { load(parseConfiguration(await file.text())) } catch (e) { setError(e instanceof Error ? e.message : 'Could not read that file.') }
            }} /></label>
            <button className="import-button" onClick={() => {
              const url = URL.createObjectURL(new Blob([exportState(state)], { type: 'application/xml' }))
              const link = document.createElement('a'); link.href = url; link.download = 'tumbletiles-board.xml'; link.click()
              setTimeout(() => URL.revokeObjectURL(url), 1000)
            }}>Export XML</button></div>
          {state.board.stickingRules?.length ? <p className="control-hint">Custom type rules are saved for this web simulator. Desktop tools may ignore them.</p> : null}
        </section>
        <section className="control-panel">
          <h2>Board</h2>
          
        <form className="control-row" onSubmit={(e) => {
          e.preventDefault() // Prevents the page from refreshing

          const newWidth = Number(width) // Gets the requested width
          const newHeight = Number(height) // Gets the requested height

          try {
            const next = resize(state, newWidth, newHeight) // Validates and resizes the board

            if (next !== state) {
              edit(() => next) // Saves the resize in undo history
              setSelection([]) // Clears selected robots and walls
              setSelectedCells([]) // Clears highlighted squares
            }
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Could not resize the board.')
          }
        }}>

            <label>Width<input aria-label="Width" type="number" min="1" max={MAX_BOARD_SIZE} required value={width} onChange={(e) => setWidth(e.target.value)} /></label>
            <label>Height<input aria-label="Height" type="number" min="1" max={MAX_BOARD_SIZE} required value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <button type="submit">Resize board</button>
          </form><p className="control-hint">Up to {MAX_BOARD_SIZE} × {MAX_BOARD_SIZE}. Shrinking keeps all tiles safe.</p>
        </section>
        
        <div className="control-danger">
          <button onClick={() => {
            edit((s) => ({
              ...initialState(),
              board: { ...s.board, polyominoes: [], concrete: [] }
            })) // Clears the board while keeping its dimensions and settings

            setSelection([]) // Clears selected robots and walls
            setSelectedCells([]) // Clears highlighted squares
          }}>
            Clear board
          </button>
        </div>

      </aside>
      <main className="simulator-stage">
        <p className="narrow-note">This screen is narrow for a board. The board scrolls inside its panel; a wider screen is easier. The tutorial reads well at this size.</p>
        <div className="view-controls control-row" aria-label="Board view">
          <button aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => changeZoom(zoom / 1.25)}>−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button aria-label="Zoom in" disabled={zoom >= 4} onClick={() => changeZoom(zoom * 1.25)}>+</button>
          <button onClick={fit}>Fit board</button>
          <button disabled={!history.length} onClick={undo}>Undo</button>
        </div>
        <div ref={panel} className={`board-panel editor-board-panel ${tool === 'pan' ? 'pan-tool' : ''}`}>
          <div ref={grid} className="board-grid editor-grid" aria-label="Simulation board" role="group"
            onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={() => { drag.current = null; setRegion(null) }} onPointerCancel={() => { drag.current = null; setRegion(null) }}
            onPointerLeave={() => setHover(null)}
            style={{ '--cell': `${cellSize}px`, gridTemplateColumns: `repeat(${state.board.cols}, ${cellSize}px)`, gridTemplateRows: `repeat(${state.board.rows}, ${cellSize}px)` } as CSSProperties}>
            {Array.from({ length: state.board.cols * state.board.rows }, (_, index) => {
              const x = index % state.board.cols, y = Math.floor(index / state.board.cols)
              const tile = cells.get(index)
              const type = types.find((t) => t.id === tile?.typeId)
              const label = tile?.isConcrete ? 'wall' : tile ? type?.label ?? tile.label ?? 'robot' : 'empty'
              return <div key={index} role="button" tabIndex={0} aria-label={`Column ${x + 1}, row ${y + 1}: ${label}`}
                aria-pressed={tile ? selected.has(tile.id) : false}
                title={label === 'empty' ? undefined : label}
                className={`board-cell ${tile ? tile.isConcrete ? 'wall' : 'robot' : ''} ${
                  (tile && selected.has(tile.id)) || highlightedCells.has(index)
                    ? 'selected-cell' // Highlights selected robots, walls, AND empty squares
                    : ''
                } ${previewCells.has(index) ? previewFits ? 'preview-cell' : 'preview-cell preview-blocked' : ''}`}
                onFocus={() => { if (placing) setHover({ x, y }) }} // Keyboard users get the same preview
                style={tile && !tile.isConcrete ? { backgroundColor: type?.color ?? tile.color ?? 'var(--color-robot)' } : undefined}
                
                onClick={() => {             
                  if (tool !== 'select' || isPasting || isMoving) clickCell(x, y) // Allows board clicks during Paste Mode or Move Mode
                }}

                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); clickCell(x, y, e.shiftKey) }
                }} />
            })}
            {region && <div className="selection-region" style={{ left: region.x * cellSize, top: region.y * cellSize, width: region.width * cellSize, height: region.height * cellSize }} />}
          </div>
          <p ref={message} className="board-message board-message-empty">{!tiles.length ? 'Empty board. Pick a tool and click a square, or load a configuration.' : ''}</p>
        </div>
        {error && <p className="board-error" role="alert">{error}</p>}
        <div className="status-bar" aria-live="polite">
          <span><b>Tool</b> {tool}</span><span><b>Board</b> {state.board.cols} × {state.board.rows}</span>
          <span><b>Robots</b> {tiles.length - state.board.concrete.length}</span><span><b>Walls</b> {state.board.concrete.length}</span>
          <span><b>Groups</b> {state.board.polyominoes.length}</span><span><b>Commands</b> {state.commands}</span><span><b>Last</b> {arrows.find(([d]) => d === state.lastCommand)?.[2] ?? '—'}</span>
        </div>
        {shortcuts && <dl className="shortcuts"><dt>↑ ← ↓ →</dt><dd>Move every robot</dd><dt>R / W / E</dt><dd>Robot / wall / erase</dd>
          <dt>V / H</dt><dd>Select / pan</dd><dt>Delete</dt><dd>Delete selected</dd><dt>Escape</dt><dd>Deselect</dd><dt>?</dt><dd>Hide this list</dd></dl>}
        <button className="shortcuts-toggle" onClick={() => setShortcuts(!shortcuts)}>{shortcuts ? 'Hide shortcuts' : 'Keyboard shortcuts (?)'}</button>
      </main>
    </div>
    <dialog ref={dialog} className="configuration-dialog" aria-labelledby="library-heading" onCancel={() => setLibrary(false)}>
      <div className="library-heading"><h2 id="library-heading">Configurations</h2><button onClick={() => setLibrary(false)}>Close library</button></div>
      {library && <PresetGallery onLoad={load} />}
    </dialog>
  </div>
}
