import { downloads, REPO_URL, RELEASES_URL } from '@/lib/downloads'
import Link from 'next/link'
import type { Build } from '@/lib/downloads'
import { LogoSolid } from './LogoSolid'
import { DownloadLink } from './download/DownloadProvider'

const year = new Date().getFullYear()

type FooterLink = { label: string; href: string; external?: boolean; build?: Build; page?: boolean }

const columns: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Download',
    links: [
      { label: 'Download for Windows', href: downloads.windows.installer.url, build: downloads.windows.installer },
      { label: 'Download for macOS', href: downloads.mac.arm64.url, build: downloads.mac.arm64 },
      { label: 'Intel Mac build', href: downloads.mac.x64.url, build: downloads.mac.x64 },
      { label: 'Portable .exe', href: downloads.windows.portable.url, build: downloads.windows.portable },
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
      { label: 'Features', href: '#features', page: true },
      { label: 'Templates', href: '#templates', page: true },
      { label: 'FAQ', href: '#faq', page: true },
      { label: 'Back to top', href: '#top' },
    ],
  },
]

/** `home` is false on sub-pages, where in-page section links point back to the home page. */
export function Footer({ home = true }: { home?: boolean }) {
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
                    {l.build ? (
                      <DownloadLink build={l.build}>{l.label}</DownloadLink>
                    ) : l.page && !home ? (
                      <Link href={`/${l.href}`}>{l.label}</Link>
                    ) : (
                      <a href={l.href} {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                        {l.label}
                      </a>
                    )}
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
