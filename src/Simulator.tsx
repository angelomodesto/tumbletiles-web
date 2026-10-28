import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, PointerEvent, SetStateAction } from 'react'
import type { Direction } from './engine'
import type { RobotType } from './engine/types'
import { parseConfiguration } from './engine/xml'
import type { Configuration } from './engine/xml'
import { cellSizeFor } from './boardLayout'
import { allTiles, assignType, exportState, initialState, loadState, moveState, place, removeTiles, resize, selectRegion, setTypes } from './simulatorState'
import type { SimulatorState } from './simulatorState'
import PresetGallery from './PresetGallery'
import './Simulator.css'

type Tool = 'robot' | 'wall' | 'erase' | 'select' | 'pan'
const arrows: [Direction, string, string][] = [['N', '↑', 'up'], ['W', '←', 'left'], ['S', '↓', 'down'], ['E', '→', 'right']]
const keys: Record<string, Direction> = { ArrowUp: 'N', ArrowLeft: 'W', ArrowDown: 'S', ArrowRight: 'E' }
const toolKeys: Record<string, Tool> = { r: 'robot', w: 'wall', e: 'erase', v: 'select', h: 'pan' }
export default function Simulator({ state, setState }: { state: SimulatorState; setState: Dispatch<SetStateAction<SimulatorState>> }) {
  const [tool, setTool] = useState<Tool>('robot')
  const [typeId, setTypeId] = useState(state.board.robotTypes?.[0]?.id ?? 'default')
  const [selection, setSelection] = useState<number[]>([])
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
  const dialog = useRef<HTMLDialogElement>(null)
  const libraryButton = useRef<HTMLButtonElement>(null)
  const drag = useRef<null | { start: { x: number; y: number }; base: number[]; pan: boolean; clientX: number; clientY: number; left: number; top: number }>(null)
  const [region, setRegion] = useState<null | { x: number; y: number; width: number; height: number }>(null)
  const types = state.board.robotTypes ?? []
  const activeType = types.find((t) => t.id === typeId) ?? types[0]
  const tiles = allTiles(state.board)
  const cells = new Map(tiles.map((tile) => [tile.y * state.board.cols + tile.x, tile]))
  const selected = new Set(selection)
  const baseSize = cellSizeFor(state.board.cols, state.board.rows, panelSize.width - 34, panelSize.height - 90)
  const cellSize = Math.max(4, Math.round(baseSize * zoom))

  function edit(action: (current: SimulatorState) => SimulatorState) {
    try {
      const next = action(state)
      setHistory((items) => [...items.slice(-29), state])
      setState(next)
      setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not update the board.') }
  }
  function undo() {
    const previous = history.at(-1)
    if (!previous) return
    setState(previous)
    setWidth(String(previous.board.cols)); setHeight(String(previous.board.rows))
    setHistory((items) => items.slice(0, -1)); setSelection([]); setError('')
  }
  function move(direction: Direction) { edit((current) => moveState(current, direction)) }
  function load(config: Configuration) {
    edit(() => loadState(config))
    setTypeId(config.robotTypes?.[0]?.id ?? 'default')
    setSelection([]); setWidth(String(config.cols)); setHeight(String(config.rows)); fit(); setLibrary(false)
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
    if (event.button !== 0 && event.button !== 1) return
    const pan = tool === 'pan' || event.button === 1
    if (!pan && tool !== 'select') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { start: cellAt(event), base: event.shiftKey ? selection : [], pan,
      clientX: event.clientX, clientY: event.clientY, left: panel.current!.scrollLeft, top: panel.current!.scrollTop }
    if (!pan) {
      const ids = selectRegion(state.board, drag.current.start, drag.current.start)
      setSelection(event.shiftKey ? [...new Set([...selection, ...ids])] : ids)
    }
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current
    if (!current) return
    if (current.pan) {
      panel.current!.scrollLeft = current.left - event.clientX + current.clientX
      panel.current!.scrollTop = current.top - event.clientY + current.clientY
    } else {
      const end = cellAt(event)
      setRegion({ x: Math.min(end.x, current.start.x), y: Math.min(end.y, current.start.y),
        width: Math.abs(end.x - current.start.x) + 1, height: Math.abs(end.y - current.start.y) + 1 })
      setSelection([...new Set([...current.base, ...selectRegion(state.board, current.start, end)])])
    }
  }
  function clickCell(x: number, y: number, shift = false) {
    if (tool === 'pan') return
    if (tool === 'select') {
      const tile = cells.get(y * state.board.cols + x)
      if (!tile) { if (!shift) setSelection([]); return }
      setSelection(shift ? selection.includes(tile.id) ? selection.filter((id) => id !== tile.id) : [...selection, tile.id] : [tile.id])
    } else edit((current) => place(current, x, y, tool, activeType?.id ?? ''))
  }

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setPanelSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
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
      if (library || event.ctrlKey || event.metaKey || event.altKey || target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return
      if (keys[event.key]) { event.preventDefault(); move(keys[event.key]); return }
      if (toolKeys[event.key.toLowerCase()]) { event.preventDefault(); setTool(toolKeys[event.key.toLowerCase()]); return }
      if (event.key === '?') setShortcuts((value) => !value)
      if (event.key === 'Escape') setSelection([])
      if ((event.key === 'Delete' || event.key === 'Backspace') && selection.length) {
        event.preventDefault(); edit((current) => removeTiles(current, selection)); setSelection([])
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  })

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
            aria-pressed={tool === name} className={tool === name ? 'active-tool' : ''} onClick={() => setTool(name)}>{name}</button>)}</div>
          {tool === 'select' && <>
            <p className="control-hint">Drag a rectangle. Shift adds to selection. {selection.length} selected.</p>
            <div className="control-row"><button disabled={!selection.length} onClick={() => { edit((s) => removeTiles(s, selection)); setSelection([]) }}>Delete selected</button>
              <button disabled={!selection.length || !activeType} onClick={() => edit((s) => assignType(s, selection, activeType!.id))}>Apply type</button>
              <button disabled={!selection.length} onClick={() => setSelection([])}>Deselect</button></div>
          </>}
          {tool === 'pan' && <p className="control-hint">Drag the board to pan. Zoom in for more room.</p>}
        </section>
        <section className="control-panel">
          <h2>Robot types</h2>
          <label className="field-label">Placement type<select aria-label="Placement type" value={activeType?.id ?? ''} onChange={(e) => setTypeId(e.target.value)}>
            {types.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}
          </select></label>
          {activeType && <details className="type-editor"><summary>Edit type & sticking</summary>
            <label className="field-label">Label<input aria-label="Type label" value={activeType.label} maxLength={60}
              onChange={(e) => { if (e.target.value.trim()) updateType({ ...activeType, label: e.target.value }) }} /></label>
            <label className="field-label">Color<input aria-label="Type color" type="color" value={activeType.color} onChange={(e) => updateType({ ...activeType, color: e.target.value })} /></label>
            <p className="control-hint">Sticks to (both directions):</p>
            {types.map((type) => <label className="rule-option" key={type.id}><input type="checkbox"
              checked={(state.board.stickingRules ?? []).some(([a, b]) => (a === activeType.id && b === type.id) || (b === activeType.id && a === type.id))}
              onChange={(e) => {
                const rules = (state.board.stickingRules ?? []).filter(([a, b]) => !((a === activeType.id && b === type.id) || (b === activeType.id && a === type.id)))
                if (e.target.checked) rules.push([activeType.id, type.id])
                edit((s) => setTypes(s, types, rules))
              }} />{type.label}{type.id === activeType.id ? ' (itself)' : ''}</label>)}
            <p className="control-hint">Unchecked types do not stick. Changing rules or assigning a type rebuilds bonds.</p>
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
          <form className="control-row" onSubmit={(e) => { e.preventDefault(); edit((s) => resize(s, Number(width), Number(height))) }}>
            <label>Width<input aria-label="Width" type="number" min="1" max="100" required value={width} onChange={(e) => setWidth(e.target.value)} /></label>
            <label>Height<input aria-label="Height" type="number" min="1" max="100" required value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <button type="submit">Resize board</button>
          </form><p className="control-hint">Up to 100 × 100. Shrinking keeps all tiles safe.</p>
        </section>
        <div className="control-danger"><button onClick={() => { edit((s) => ({ ...initialState(), board: { ...s.board, polyominoes: [], concrete: [] } })); setSelection([]) }}>Clear board</button></div>
      </aside>
      <main className="simulator-stage">
        <div className="view-controls control-row" aria-label="Board view">
          <button aria-label="Zoom out" disabled={zoom <= 0.5} onClick={() => changeZoom(zoom / 1.25)}>−</button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button aria-label="Zoom in" disabled={zoom >= 4} onClick={() => changeZoom(zoom * 1.25)}>+</button>
          <button onClick={fit}>Fit board</button>
          <button disabled={!history.length} onClick={undo}>Undo</button>
        </div>
        {error && <p className="board-error" role="alert">{error}</p>}
        <div ref={panel} className={`board-panel editor-board-panel ${tool === 'pan' ? 'pan-tool' : ''}`}>
          <div ref={grid} className="board-grid editor-grid" aria-label="Simulation board" role="group"
            onPointerDown={pointerDown} onPointerMove={pointerMove}
            onPointerUp={() => { drag.current = null; setRegion(null) }} onPointerCancel={() => { drag.current = null; setRegion(null) }}
            style={{ '--cell': `${cellSize}px`, gridTemplateColumns: `repeat(${state.board.cols}, ${cellSize}px)`, gridTemplateRows: `repeat(${state.board.rows}, ${cellSize}px)` } as CSSProperties}>
            {Array.from({ length: state.board.cols * state.board.rows }, (_, index) => {
              const x = index % state.board.cols, y = Math.floor(index / state.board.cols)
              const tile = cells.get(index)
              const type = types.find((t) => t.id === tile?.typeId)
              const label = tile?.isConcrete ? 'wall' : tile ? type?.label ?? tile.label ?? 'robot' : 'empty'
              return <div key={index} role="button" tabIndex={0} aria-label={`Column ${x + 1}, row ${y + 1}: ${label}`}
                aria-pressed={tile ? selected.has(tile.id) : false}
                title={label === 'empty' ? undefined : label}
                className={`board-cell ${tile ? tile.isConcrete ? 'wall' : 'robot' : ''} ${tile && selected.has(tile.id) ? 'selected-cell' : ''}`}
                style={tile && !tile.isConcrete ? { backgroundColor: type?.color ?? 'var(--color-robot)' } : undefined}
                onClick={() => { if (tool !== 'select') clickCell(x, y) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); clickCell(x, y, e.shiftKey) }
                }} />
            })}
            {region && <div className="selection-region" style={{ left: region.x * cellSize, top: region.y * cellSize, width: region.width * cellSize, height: region.height * cellSize }} />}
          </div>
          <p className="board-message board-message-empty">{!tiles.length ? 'Empty board. Pick a tool and click a square, or load a configuration.' : ''}</p>
        </div>
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
