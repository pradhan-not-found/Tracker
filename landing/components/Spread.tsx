import type { ReactNode } from 'react'

/** Tiny uppercase running header: section name · publication line. */
export function Meta({ label, right = 'Tracker 2.1' }: { label: string; right?: string }) {
  return (
    <div className="meta">
      <span className="meta-label" aria-hidden>
        {label}
      </span>
      <span className="meta-right" aria-hidden>
        {right}
      </span>
    </div>
  )
}

/** Large light headline; each entry in `lines` rises in on its own. */
export function Display({
  id,
  lines,
  as: Tag = 'h2',
  className = '',
}: {
  id?: string
  lines: string[]
  as?: 'h1' | 'h2'
  className?: string
}) {
  return (
    <Tag id={id} className={`display ${className}`} data-reveal>
      {lines.map((l, i) => (
        <span className="display-line" data-reveal-item style={{ ['--i' as string]: i }} key={i}>
          {l}
          {i < lines.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

/** A full-width editorial "spread" with a running header. */
export function Spread({
  id,
  label,
  title,
  className = '',
  children,
}: {
  id: string
  label: string
  title: string[]
  className?: string
  children: ReactNode
}) {
  return (
    <section className={`spread ${className}`} id={id} aria-labelledby={`${id}-title`}>
      <Meta label={label} />
      <Display id={`${id}-title`} lines={title} />
      <div className="spread-body">{children}</div>
    </section>
  )
}
