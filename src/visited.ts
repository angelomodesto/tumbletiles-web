const KEY = 'tumbletiles.visited'

/**
 * Whether this browser has been through onboarding before. Used only to decide
 * which landing button is emphasised; both are always offered.
 *
 * Storage can throw in a private window, so every access is guarded.
 */
export function hasVisited(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function markVisited(): void {
  try {
    window.localStorage.setItem(KEY, 'true')
  } catch {
    // A browser that refuses storage simply keeps seeing the first-time view.
  }
}
