'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LogoSolid } from './LogoSolid'
import { DownloadIcon } from './icons'

/** Glass nav bar that slides away while scrolling down and returns on any upward scroll. */
const sections = [
  { href: '#features', label: 'Features' },
  { href: '#views', label: 'Views' },
  { href: '#templates', label: 'Templates' },
  { href: '#faq', label: 'FAQ' },
]

/** `home` is false on sub-pages: section links and the brand then lead back to the home page. */
export function Nav({ home = true }: { home?: boolean }) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      if (y < 80) {
        setHidden(false)
        lastY = y
        return
      }
      const delta = y - lastY
      if (Math.abs(delta) < 8) return // ignore jitter
      setHidden(delta > 0)
      lastY = y
    }
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header className="nav" data-hidden={hidden ? 'true' : 'false'}>
      <div className="nav-inner">
        {home ? (
          <a href="#top" className="brand brand-nav" aria-label="Tracker, back to top">
            <LogoSolid size={31} />
            <span>Tracker</span>
          </a>
        ) : (
          <Link href="/" className="brand brand-nav" aria-label="Tracker home">
            <LogoSolid size={31} />
            <span>Tracker</span>
          </Link>
        )}
        <nav aria-label="Primary" className="nav-links">
          {sections.map((l) =>
            home ? (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ) : (
              <Link key={l.href} href={`/${l.href}`}>
                {l.label}
              </Link>
            ),
          )}
        </nav>
        {/* The download page detects the system and starts the right build by itself. */}
        <Link href="/download/" className="btn btn-solid btn-sm">
          <DownloadIcon width={14} height={14} />
          Download
        </Link>
      </div>
    </header>
  )
}
