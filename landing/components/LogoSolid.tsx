import { useId } from 'react'

/**
 * Filled Tracker mark (stacked cards with a check) in currentColor. The two card edges
 * and the check are knocked out with a mask. Mirrors public/logo-solid.svg; the mask id
 * is unique per instance because the mark renders in both the nav and the footer.
 */
export function LogoSolid({ size = 22, className = '' }: { size?: number; className?: string }) {
  const id = `tracker-cut-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`logo-mark ${className}`}
      aria-hidden
      focusable={false}
    >
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <path
            fill="#fff"
            d="M7.5 3h9A4.5 4.5 0 0 1 21 7.5v9.6a3.9 3.9 0 0 1-3.9 3.9H7.6A4.6 4.6 0 0 1 3 16.4V7.5A4.5 4.5 0 0 1 7.5 3Z"
          />
          <g fill="none" stroke="#000" strokeLinecap="round" strokeLinejoin="round">
            <path strokeWidth={1.3} d="M2 11.2a3.7 3.7 0 0 1 5-3.6l10.4 1.1A4 4 0 0 1 22 12.6" />
            <path strokeWidth={1.3} d="M2 16.4a3.9 3.9 0 0 1 4.6-3.9l10.2-1.1A3.8 3.8 0 0 1 22 15.2" />
            <path strokeWidth={1.7} d="m6.5 16.8 1.6 1.6 3.2-3.2" />
          </g>
        </mask>
      </defs>
      <rect width="24" height="24" fill="currentColor" mask={`url(#${id})`} />
    </svg>
  )
}
