import { useEffect, useState } from 'react'
import { parseConfiguration } from './engine/xml'
import type { Configuration } from './engine/xml'
import { loadPresetIndex } from './presets'
import type { Preset } from './presets'

interface Entry { preset: Preset; config?: Configuration; error?: string }
export default function PresetGallery({ onLoad }: { onLoad: (config: Configuration) => void }) {
  const [entries, setEntries] = useState<Entry[]>([])
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    loadPresetIndex().then((presets) => {
      if (controller.signal.aborted) return
      setEntries(presets.map((preset) => ({ preset })))
      return Promise.all(presets.map(async (preset) => {
        let entry: Entry
        try {
          const response = await fetch(`${import.meta.env.BASE_URL}presets/${preset.file}`, { signal: controller.signal })
          if (!response.ok) throw new Error('Preview unavailable')
          entry = { preset, config: parseConfiguration(await response.text()) }
        } catch { entry = { preset, error: 'Could not load this configuration.' } }
        if (!controller.signal.aborted) setEntries((items) => items.map((item) => item.preset.id === preset.id ? entry : item))
      }))
    }).catch(() => { if (!controller.signal.aborted) setError('Could not load the configuration library.') })
    return () => controller.abort()
  }, [attempt])
  return <div className="preset-gallery">
    {error && <p role="alert">{error}</p>}
    {!entries.length && !error && <p role="status">Loading configurations…</p>}
    {entries.map(({ preset, config, error }) => <button type="button" className="preset-card" key={preset.id}
      disabled={!config} onClick={() => config && onLoad(config)} aria-label={`Load ${preset.name}`}>
      {config ? <svg viewBox={`0 0 ${config.cols} ${config.rows}`} role="img" aria-label={`${preset.name} board preview`}>
        <rect width={config.cols} height={config.rows} fill="white" />
        {config.tiles.map((tile, i) => <rect key={i} x={tile.x} y={tile.y} width="1" height="1"
          fill={tile.isConcrete ? '#9aa0a8' : '#111318'} />)}
      </svg> : <span className="preview-placeholder">{error ?? 'Loading preview…'}</span>}
      <strong>{preset.name}</strong>
      <span>{preset.cols} × {preset.rows} · {preset.robots} robots</span>
      <span className="control-hint">{preset.description}</span>
    </button>)}
    {(error || entries.some((e) => e.error)) && <button type="button" onClick={() => { setError(''); setEntries([]); setAttempt((a) => a + 1) }}>Retry previews</button>}
  </div>
}
