/** One configuration that ships with the simulator. */
export interface Preset {
  id: string
  name: string
  file: string
  cols: number
  rows: number
  robots: number
  walls: number
  bytes: number
  description: string
}

/**
 * Reads the list of bundled configurations. The files themselves are only
 * fetched when one is chosen, so none of them are in the app's bundle.
 */
export async function loadPresetIndex(): Promise<Preset[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}presets/index.json`)
  if (!response.ok) throw new Error('Could not read the preset list.')

  const data: unknown = await response.json()
  if (typeof data !== 'object' || data === null || !('presets' in data)) return []

  return (data as { presets: Preset[] }).presets
}
