export type Page = 'home' | 'tutorial' | 'simulator'

interface SiteHeaderProps {
  current: Page
  onHome: () => void
  onTutorial: () => void
  onSimulator: () => void
}

/**
 * The same header on every screen: the wordmark is always the way back to the
 * landing page, and the two destinations are always reachable with the current
 * one marked.
 */
function SiteHeader({ current, onHome, onTutorial, onSimulator }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
      <button
        type="button"
        className="site-wordmark"
        onClick={onHome}
        aria-current={current === 'home' ? 'page' : undefined}
      >
        Tumble Tiles
      </button>

      <nav className="site-nav" aria-label="Main">
        <button
          type="button"
          className={current === 'tutorial' ? 'active-tool' : undefined}
          aria-current={current === 'tutorial' ? 'page' : undefined}
          onClick={onTutorial}
        >
          Tutorial
        </button>

        <button
          type="button"
          className={current === 'simulator' ? 'active-tool' : undefined}
          aria-current={current === 'simulator' ? 'page' : undefined}
          onClick={onSimulator}
        >
          Simulator
        </button>
      </nav>
      </div>
    </header>
  )
}

export default SiteHeader
