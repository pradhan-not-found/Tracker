import { downloads, REPO_URL, RELEASES_URL } from '@/lib/downloads'
import { LogoSolid } from './LogoSolid'

const year = new Date().getFullYear()

const columns = [
  {
    title: 'Download',
    links: [
      { label: 'Download for Windows', href: downloads.windows.installer.url },
      { label: 'Download for macOS', href: downloads.mac.arm64.url },
      { label: 'Intel Mac build', href: downloads.mac.x64.url },
      { label: 'Portable .exe', href: downloads.windows.portable.url },
    ],
  },
  {
    title: 'Project',
    links: [
      { label: 'GitHub repository', href: REPO_URL, external: true },
      { label: 'Releases', href: RELEASES_URL, external: true },
    ],
  },
  {
    title: 'Guide',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Templates', href: '#templates' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Back to top', href: '#top' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer-panel glass">
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="brand brand-footer">
              <LogoSolid size={38} />
              <span>Tracker</span>
            </span>
            <p className="footer-tag">Your data, organised your way. Private, offline and on your desk.</p>
          </div>
          {columns.map((c) => (
            <nav className="footer-col" aria-label={c.title} key={c.title}>
              <p className="footer-col-title">{c.title}</p>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...('external' in l && l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="footer-bottom">
          <span>© {year} Tracker</span>
          <span>Made for people who like their data close to home</span>
        </div>
      </div>
    </footer>
  )
}
