'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import type { Build } from '@/lib/downloads'
import { CheckIcon, ChevronDown, DownloadIcon } from '../icons'
import { DownloadLink } from './DownloadProvider'

export type SplitOption = { build: Build; title: string; sub: string }

/**
 * One pill: the main part downloads `primary`; the chevron opens a menu with every build for the platform.
 * The menu is portalled to <body> so cards (glass = own stacking context) can never clip or cover it.
 */
export function SplitDownload({ primary, label, options }: { primary: Build; label: string; options: SplitOption[] }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const chevron = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const focusOnOpen = useRef<'first' | 'last' | 'current'>('current')
  const menuId = useId()

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) chevron.current?.focus()
  }, [])

  const place = useCallback(() => {
    const el = root.current
    if (!el) return
    const b = el.getBoundingClientRect()
    const vw = document.documentElement.clientWidth
    // flush under the split button, same width (at least 260px), never past the viewport edge
    const width = Math.min(Math.max(b.width, 260), vw - 16)
    const left = Math.min(Math.max(8, b.left), vw - width - 8)
    setPos({ top: b.bottom + window.scrollY + 6, left: left + window.scrollX, width })
  }, [])

  // position before paint, then keep it in place on resize
  useLayoutEffect(() => {
    if (!open) return
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open, place])

  // focus an item once the menu is in the DOM
  useEffect(() => {
    if (!open || !pos) return
    const list = items()
    const current = list.findIndex((i) => i.dataset.current === 'true')
    const target = focusOnOpen.current === 'first' ? 0 : focusOnOpen.current === 'last' ? list.length - 1 : Math.max(0, current)
    list[target]?.focus()
  }, [open, pos])

  // click / tap outside closes; leaving with Tab closes
  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node
      if (!menu.current?.contains(t) && !root.current?.contains(t)) close(false)
    }
    const onFocus = (e: FocusEvent) => {
      const t = e.target as Node
      if (!menu.current?.contains(t) && !root.current?.contains(t)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('focusin', onFocus)
    }
  }, [open, close])

  const onChevronKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      focusOnOpen.current = e.key === 'ArrowDown' ? 'first' : 'last'
      setOpen(true)
    }
  }

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items()
    const i = list.indexOf(document.activeElement as HTMLElement)
    let n = -1
    if (e.key === 'ArrowDown') n = (i + 1) % list.length
    else if (e.key === 'ArrowUp') n = (i - 1 + list.length) % list.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = list.length - 1
    else if (e.key === 'Escape') {
      e.preventDefault()
      close(true)
      return
    } else if (e.key === ' ') {
      // links only react to Enter natively; Space selects too
      e.preventDefault()
      ;(document.activeElement as HTMLElement | null)?.click()
      return
    } else if (e.key === 'Tab') {
      close(false)
      return
    } else return
    e.preventDefault()
    list[n]?.focus()
  }

  return (
    <div className={`split-dl ${open ? 'is-open' : ''}`} ref={root}>
      <DownloadLink className="btn btn-solid split-dl-main" build={primary}>
        <DownloadIcon />
        {label}
      </DownloadLink>
      <button
        ref={chevron}
        type="button"
        className="btn btn-solid split-dl-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label="More download options"
        onClick={() => {
          focusOnOpen.current = 'current'
          setOpen((o) => !o)
        }}
        onKeyDown={onChevronKey}
      >
        <ChevronDown width={16} height={16} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={menu}
            id={menuId}
            role="menu"
            aria-label="Download options"
            className="split-dl-menu"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            onKeyDown={onMenuKey}
          >
            {options.map((o) => {
              const current = o.build.id === primary.id
              return (
                <DownloadLink
                  key={o.build.id}
                  build={o.build}
                  role="menuitem"
                  tabIndex={-1}
                  data-current={current}
                  className={`split-dl-item ${current ? 'is-current' : ''}`}
                  title={o.build.file}
                  returnFocus={() => chevron.current}
                  onClick={() => setOpen(false)}
                >
                  <span className="split-dl-text">
                    <span className="split-dl-title">{o.title}</span>
                    <span className="split-dl-sub">{o.sub}</span>
                  </span>
                  <span className="split-dl-check" aria-hidden>
                    {current && <CheckIcon width={14} height={14} />}
                  </span>
                  {current && <span className="sr-only"> (main button)</span>}
                </DownloadLink>
              )
            })}
          </div>,
          document.body,
        )}
    </div>
  )
}
