/**
 * Starts a file download without leaving the page.
 *
 * GitHub release assets answer with `Content-Disposition: attachment`, so a top-level
 * navigation to them becomes a download and the current page stays where it is. A
 * temporary anchor click is used (rather than a hidden iframe) because browsers allow it
 * with or without a user gesture, which the auto-starting /download/ page needs.
 */
export function startDownload(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** Plain left click, no modifiers: the only case we intercept (middle-click, Cmd/Ctrl-click keep native behaviour). */
export function isPlainLeftClick(e: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean }) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey
}

// Remember history (Back/Forward) navigations, so pages that auto-start a download don't
// start it again when the visitor simply comes back. This module is loaded on every page
// that has download links, so the listener is in place before such a navigation happens.
let lastHistoryNav = -Infinity
if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    lastHistoryNav = performance.now()
  })
}

/** True when the current page was reached with Back/Forward (client-side or a full reload of history). */
export function arrivedViaHistory() {
  if (performance.now() - lastHistoryNav < 2000) return true
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  // The navigation entry describes the document's first load only; trust it only while still on that URL.
  return entry?.type === 'back_forward' && entry.name === window.location.href
}
