import { Display, Meta } from './Spread'
import { PlatformButtons } from './PlatformButtons'

const index = [
  { label: 'Any tracker, typed columns', href: '#features' },
  { label: 'Table, calendar, dashboard', href: '#views' },
  { label: 'Templates', href: '#templates' },
  { label: 'Private, local-first', href: '#privacy' },
  { label: 'Download', href: '#download' },
]

export function Hero() {
  return (
    <header className="spread hero" id="top">
      <Meta label="Local-first databases" />
      <Display as="h1" id="hero-title" className="display-hero" lines={['Your data, organised', 'your way.']} />

      <div className="hero-bottom">
        <div className="hero-intro" data-reveal>
          <p className="lede" data-reveal-item style={{ ['--i' as string]: 2 }}>
            Tracker is a private desktop app for building your own databases: to-dos, marks, attendance and inventory,
            with a table, a calendar and a dashboard. Everything stays on your computer.
          </p>
          <div data-reveal-item style={{ ['--i' as string]: 3 }}>
            <PlatformButtons />
          </div>
        </div>

        <nav className="index" aria-label="Contents" data-reveal>
          <ul>
            {index.map((it, i) => (
              <li key={it.href} data-reveal-item style={{ ['--i' as string]: i + 3 }}>
                <a href={it.href}>
                  <span className="index-label">{it.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
