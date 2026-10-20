'use client'

import { useEffect } from 'react'

/**
 * Adds `is-in` to every `[data-reveal]` element once it scrolls into view.
 * Children with `data-reveal-item` inherit a stagger via the `--i` custom property.
 * Also picks up elements added later (client-side navigation between pages, state changes).
 */
export function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const supported = 'IntersectionObserver' in window
    const io = supported
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                entry.target.classList.add('is-in')
                io?.unobserve(entry.target)
              }
            }
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.04 },
        )
      : null

    const seen = new WeakSet<Element>()
    const scan = (root: ParentNode) => {
      const found = root.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-in)')
      const list = root instanceof HTMLElement && root.matches('[data-reveal]:not(.is-in)') ? [root, ...found] : [...found]
      for (const el of list) {
        if (seen.has(el)) continue
        seen.add(el)
        if (reduce || !io) el.classList.add('is-in')
        else io.observe(el)
      }
    }
    scan(document)

    const mo = new MutationObserver((records) => {
      for (const r of records) r.addedNodes.forEach((n) => n instanceof HTMLElement && scan(n))
    })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io?.disconnect()
    }
  }, [])
  return null
}
