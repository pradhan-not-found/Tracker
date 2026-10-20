'use client'

import { useEffect, useState } from 'react'
import { LogoSolid } from './LogoSolid'
import { DownloadIcon } from './icons'

/** Glass nav bar that slides away while scrolling down and returns on any upward scroll. */
export function Nav() {
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
        <a href="#top" className="brand brand-nav" aria-label="Tracker, back to top">
          <LogoSolid size={31} />
          <span>Tracker</span>
        </a>
        <nav aria-label="Primary" className="nav-links">
          <a href="#features">Features</a>
          <a href="#views">Views</a>
          <a href="#templates">Templates</a>
          <a href="#faq">FAQ</a>
        </nav>
        <a href="#download" className="btn btn-solid btn-sm">
          <DownloadIcon width={14} height={14} />
          Download
        </a>
      </div>
    </header>
  )
}
