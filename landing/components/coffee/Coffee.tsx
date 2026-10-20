'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { asset } from '@/lib/paths'
import { CloseIcon, CoffeeIcon } from '../icons'

const GITHUB = 'https://github.com/pradhan-not-found'

/** Footer text link, styled like the other footer links, that opens the support dialog. */
export function CoffeeLink() {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => {
    setOpen(false)
    requestAnimationFrame(() => trigger.current?.focus({ preventScroll: true }))
  }, [])

  return (
    <>
      <button ref={trigger} type="button" className="footer-coffee" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span className="footer-link-icon" aria-hidden="true">
          <CoffeeIcon width={16} height={16} />
        </span>
        <span className="footer-link-label">Buy me a coffee</span>
      </button>
      {open && <CoffeeDialog onClose={close} />}
    </>
  )
}

function CoffeeDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const d = ref.current
    if (!d) return
    // Native modal dialog: the page behind becomes inert (focus stays inside); Esc fires "close".
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal()
      else d.setAttribute('open', '')
    }
    d.addEventListener('close', onClose)
    return () => d.removeEventListener('close', onClose)
  }, [onClose])

  const dismiss = () => {
    const d = ref.current
    if (d && typeof d.close === 'function') d.close()
    else onClose()
  }

  return (
    <dialog
      ref={ref}
      className="coffee-dialog"
      aria-modal="true"
      aria-labelledby="coffee-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss()
      }}
    >
      <div className="coffee-panel">
        <button type="button" className="coffee-close" aria-label="Close" onClick={dismiss} autoFocus>
          <CloseIcon />
        </button>

        <h2 id="coffee-title" className="coffee-title">
          Buy me a coffee
        </h2>

        <figure className="coffee-qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={asset('coffee-qr.svg')} alt="UPI QR code to pay Souradeep Pradhan" width={200} height={200} />
          <figcaption>Scan with any UPI app</figcaption>
        </figure>

        <p className="coffee-credit">
          <span className="coffee-made">Made by</span>
          <a
            className="coffee-who"
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Souradeep Pradhan on GitHub"
          >
            {/* decorative: the name sits right next to it */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={asset('avatar-souradeep.jpg')} alt="" width={24} height={24} />
            <span className="coffee-name">Souradeep Pradhan</span>
          </a>
        </p>
      </div>
    </dialog>
  )
}
