import { useState } from 'react'
import type { RobotType } from './engine/types'

/** Draft locally so keystrokes and continuous color input do not fill undo history. */
export default function TypeAppearanceEditor({ type, onCommit }: { type: RobotType; onCommit: (type: RobotType) => void }) {
  const [label, setLabel] = useState(type.label)
  const [color, setColor] = useState(type.color)
  function commit() {
    const trimmed = label.trim()
    if (!trimmed) { setLabel(type.label); return }
    if (trimmed !== type.label || color !== type.color) onCommit({ ...type, label: trimmed, color })
  }
  return <>
    <label className="field-label">Label<input aria-label="Type label" value={label} maxLength={60}
      onChange={(e) => setLabel(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} /></label>
    <label className="field-label">Color<input aria-label="Type color" type="color" value={color}
      onInput={(e) => setColor(e.currentTarget.value)} onChange={(e) => setColor(e.target.value)} onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }} /></label>
    <p className="control-hint">Label and color changes save when you leave the field.</p>
  </>
}
