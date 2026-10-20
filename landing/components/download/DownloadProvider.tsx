'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react'
import type { Build } from '@/lib/downloads'
import { isPlainLeftClick, startDownload } from '@/lib/start-download'
import { CloseIcon } from '../icons'
import { DownloadDetails } from './DownloadStarted'

type Start = (build: Build, from?: HTMLElement | null) => void

const DownloadCtx = createContext<Start | null>(null)

/**
 * Wrap a page in this to make every <DownloadLink> start its file in place and show the
 * "Your download has started" dialog. Without the provider (or with JS off) links stay plain hrefs.
 */
export function DownloadProvider({
  children,
  otherPlatformsHref = '#download',
}: {
  children: ReactNode
  otherPlatformsHref?: string
}) {
  const [build, setBuild] = useState<Build | null>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  const start = useCallback<Start>((b, from) => {
    startDownload(b.url)
    returnTo.current = from ?? null
    setBuild(b)
  }, [])

  const close = useCallback((restoreFocus = true) => {
    setBuild(null)
    const el = returnTo.current
    returnTo.current = null
    if (restoreFocus && el) requestAnimationFrame(() => el.focus({ preventScroll: true }))
  }, [])

  return (
    <DownloadCtx.Provider value={start}>
      {children}
      {build && <DownloadDialog build={build} otherHref={otherPlatformsHref} onClose={close} />}
    </DownloadCtx.Provider>
  )
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  build: Build
  children: ReactNode
  /** Where focus goes when the dialog closes (default: this link). Use when the link itself disappears, e.g. in a menu. */
  returnFocus?: () => HTMLElement | null
}

/** A real link to the release asset that, on a plain left click, downloads in place and opens the dialog. */
export function DownloadLink({ build, children, onClick, returnFocus, ...rest }: LinkProps) {
  const start = useContext(DownloadCtx)
  return (
    <a
      {...rest}
      href={build.url}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || !start || !isPlainLeftClick(e)) return
        e.preventDefault()
        start(build, returnFocus?.() ?? e.currentTarget)
      }}
    >
      {children}
    </a>
  )
}

function DownloadDialog({
  build,
  otherHref,
  onClose,
}: {
  build: Build
  otherHref: string
  onClose: (restoreFocus?: boolean) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const restore = useRef(true)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    // Native modal dialog: the rest of the page becomes inert, so focus stays inside; Esc fires "cancel".
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '') // very old browsers: still visible, closes via the buttons
    }
    const onCloseEvt = () => onClose(restore.current)
    d.addEventListener('close', onCloseEvt)
    return () => d.removeEventListener('close', onCloseEvt)
  }, [onClose])

  const dismiss = (restoreFocus = true) => {
    restore.current = restoreFocus
    const d = ref.current
    if (d && typeof d.close === 'function') d.close()
    else onClose(restoreFocus)
  }

  return (
    <dialog
      ref={ref}
      className="dl-dialog"
      aria-modal="true"
      aria-labelledby="dl-dialog-title"
      aria-describedby="dl-dialog-desc"
      onClick={(e) => {
        // click on the backdrop (outside the panel) closes
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="dl-panel">
        <div className="dl-head">
          <div>
            <p className="dl-kicker">
              Downloading
            </p>
            <h2 id="dl-dialog-title" className="dl-title">
              Your download has started.
            </h2>
            <p id="dl-dialog-desc" className="dl-sub">
              Check your browser’s downloads. Here is what happens next.
            </p>
          </div>
          <button type="button" className="dl-close" aria-label="Close" onClick={() => dismiss()} autoFocus>
            <CloseIcon />
          </button>
        </div>
        <DownloadDetails build={build} />
        <div className="dl-foot">
          <span>
            Download didn’t start?{' '}
            <a className="text-link" href={build.url}>
              Try again
            </a>
          </span>
          <a
            className="text-link"
            href={otherHref}
            onClick={() => {
              dismiss(false)
              // move keyboard focus to the section the link scrolls to
              const target = document.querySelector<HTMLElement>(otherHref)
              if (target) {
                if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
                requestAnimationFrame(() => target.focus({ preventScroll: true }))
              }
            }}
          >
            Other platforms
          </a>
        </div>
      </div>
    </dialog>
  )
}
