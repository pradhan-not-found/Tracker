'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { CheckIcon, PlusIcon, TrashIcon } from '../icons'
import {
  addDays,
  parseDay,
  PRIORITY_LABEL,
  STATUS_LABEL,
  useDemo,
  useStats,
  type Priority,
  type Row,
  type Status,
} from './store'

const monthFmt = new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' })
const shortFmt = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

export function dueLabel(due: string, todayIso: string, today: Date) {
  if (due === todayIso) return 'Today'
  const d = parseDay(due)
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return shortFmt.format(d)
}

const statusTone: Record<Status, string> = { todo: 'gray', progress: 'blue', done: 'green' }
const priorityTone: Record<Priority, string> = { low: 'gray', medium: 'amber', high: 'red' }

/* -------------------------------------------------------------------------- */
/* Table                                                                       */
/* -------------------------------------------------------------------------- */

export function DemoTable({ inputRef }: { inputRef?: React.RefObject<HTMLInputElement | null> }) {
  const { rows, toggle, cycleStatus, cyclePriority, remove, add, todayIso, today } = useDemo()
  const [draft, setDraft] = useState('')
  const ownRef = useRef<HTMLInputElement>(null)
  const ref = inputRef ?? ownRef
  const inputId = useId()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return ref.current?.focus()
    add(draft)
    setDraft('')
  }

  return (
    <div className="dt" role="table" aria-label="Demo to-do sheet">
      <div className="dt-row dt-head" role="row">
        <span className="dt-idx" role="columnheader">
          #
        </span>
        <span role="columnheader">Task</span>
        <span role="columnheader">Status</span>
        <span className="dt-pri" role="columnheader">
          Priority
        </span>
        <span className="dt-due" role="columnheader">
          Due date
        </span>
        <span className="dt-done" role="columnheader">
          Done
        </span>
        <span className="dt-del" role="columnheader">
          <span className="sr-only">Delete</span>
        </span>
      </div>
      {rows.map((r, i) => (
        <TableRow
          key={r.id}
          r={r}
          i={i}
          label={dueLabel(r.due, todayIso, today)}
          overdue={r.status !== 'done' && r.due < todayIso}
          onToggle={() => toggle(r.id)}
          onStatus={() => cycleStatus(r.id)}
          onPriority={() => cyclePriority(r.id)}
          onDelete={() => remove(r.id)}
        />
      ))}
      <form className="dt-row dt-add" role="row" onSubmit={submit}>
        <span className="dt-idx" aria-hidden>
          <PlusIcon />
        </span>
        <label htmlFor={inputId} className="sr-only">
          New task
        </label>
        <input
          id={inputId}
          ref={ref}
          className="dt-input"
          placeholder="Type a task and press Enter…"
          value={draft}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft('')
              e.currentTarget.blur()
            }
          }}
        />
        <button type="submit" className="dt-add-btn" disabled={!draft.trim()}>
          Add
        </button>
      </form>
    </div>
  )
}

function TableRow({
  r,
  i,
  label,
  overdue,
  onToggle,
  onStatus,
  onPriority,
  onDelete,
}: {
  r: Row
  i: number
  label: string
  overdue: boolean
  onToggle: () => void
  onStatus: () => void
  onPriority: () => void
  onDelete: () => void
}) {
  const done = r.status === 'done'
  return (
    <div
      className={`dt-row ${done ? 'is-done' : ''} ${r.fresh ? 'is-fresh' : ''} ${r.leaving ? 'is-leaving' : ''}`}
      role="row"
    >
      <span className="dt-idx" role="cell">
        {i + 1}
      </span>
      <span className="dt-task" role="cell">
        {r.task}
      </span>
      <span role="cell">
        <button
          type="button"
          className={`pill pill-${statusTone[r.status]} pill-btn`}
          onClick={onStatus}
          aria-label={`Status: ${STATUS_LABEL[r.status]}. Change status of ${r.task}`}
        >
          {STATUS_LABEL[r.status]}
        </button>
      </span>
      <span className="dt-pri" role="cell">
        <button
          type="button"
          className={`pill pill-${priorityTone[r.priority]} pill-btn pill-flat`}
          onClick={onPriority}
          aria-label={`Priority: ${PRIORITY_LABEL[r.priority]}. Change priority of ${r.task}`}
        >
          {PRIORITY_LABEL[r.priority]}
        </button>
      </span>
      <span className={`dt-due ${overdue ? 'is-overdue' : ''}`} role="cell">
        {label}
        {overdue && <span className="sr-only"> (overdue)</span>}
      </span>
      <span className="dt-done" role="cell">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Done: ${r.task}`}
          className={`dt-check ${done ? 'on' : ''}`}
          onClick={onToggle}
        >
          {done && <CheckIcon />}
        </button>
      </span>
      <span className="dt-del" role="cell">
        <button type="button" className="dt-trash" onClick={onDelete} aria-label={`Delete ${r.task}`}>
          <TrashIcon />
        </button>
      </span>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Calendar                                                                    */
/* -------------------------------------------------------------------------- */

export function DemoCalendar() {
  const { rows, today, todayIso } = useDemo()
  const first = new Date(today.getFullYear(), today.getMonth(), 1)
  const lead = (first.getDay() + 6) % 7 // Monday-first
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => addDays(first, i))]
  while (cells.length % 7) cells.push(null)
  const live = rows.filter((r) => !r.leaving)
  const inMonth = live.filter((r) => {
    const d = parseDay(r.due)
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
  }).length

  return (
    <div className="mcal">
      <div className="mcal-head">
        <strong>{monthFmt.format(today)}</strong>
        <span className="dim">
          {inMonth} record{inMonth === 1 ? '' : 's'} this month
        </span>
      </div>
      <div className="mcal-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span className="mcal-dow" key={d}>
            {d}
          </span>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div className="mcal-cell empty" key={i} />
          const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          const items = live.filter((r) => r.due === iso)
          return (
            <div className={`mcal-cell ${iso === todayIso ? 'is-today' : ''}`} key={i}>
              <span className="mcal-num">{d.getDate()}</span>
              {items.slice(0, 2).map((r) => (
                <span
                  className={`mcal-ev ev-${r.status === 'done' ? 'done' : r.due < todayIso ? 'red' : statusTone[r.status]}`}
                  key={r.id}
                >
                  {r.task}
                </span>
              ))}
              {items.length > 2 && <span className="mcal-more">+{items.length - 2} more</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                   */
/* -------------------------------------------------------------------------- */

export function DemoDashboard() {
  const s = useStats()
  const max = (xs: { n: number }[]) => Math.max(1, ...xs.map((x) => x.n))
  const sMax = max(s.byStatus)
  const pMax = max(s.byPriority)
  return (
    <div className="mdash">
      <div className="kpis">
        <div className="kpi">
          <span className="kpi-label">Total records</span>
          <span className="kpi-value">{s.total}</span>
          <span className="kpi-sub">in this sheet</span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Done rate</span>
          <span className="kpi-value">{s.doneRate}%</span>
          <span className="kpi-meter" aria-hidden>
            <i style={{ width: `${s.doneRate}%` }} />
          </span>
          <span className="kpi-sub">
            {s.done} of {s.total}
          </span>
        </div>
        <div className="kpi">
          <span className="kpi-label">Due today</span>
          <span className="kpi-value">{s.dueToday}</span>
          <span className={`kpi-sub ${s.overdue ? 'tone-red' : ''}`}>{s.overdue} overdue</span>
        </div>
      </div>
      <div className="dash-row">
        <div className="dash-card">
          <p className="dash-title">
            By status <span className="dim">{s.total} records</span>
          </p>
          <ul className="bars">
            {s.byStatus.map((b) => (
              <li key={b.key}>
                <span className={`bar-dot dot-${statusTone[b.key]}`} />
                <span className="bar-label">{STATUS_LABEL[b.key]}</span>
                <span className="bar-track">
                  <i style={{ width: `${(b.n / sMax) * 100}%` }} />
                </span>
                <span className="bar-n">{b.n}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="dash-card">
          <p className="dash-title">
            By priority <span className="dim">{s.total} records</span>
          </p>
          <ul className="bars">
            {s.byPriority.map((b) => (
              <li key={b.key}>
                <span className={`bar-dot dot-${priorityTone[b.key]}`} />
                <span className="bar-label">{PRIORITY_LABEL[b.key]}</span>
                <span className="bar-track">
                  <i style={{ width: `${(b.n / pMax) * 100}%` }} />
                </span>
                <span className="bar-n">{b.n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
