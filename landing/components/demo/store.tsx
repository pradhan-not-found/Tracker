'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react'

export type Status = 'todo' | 'progress' | 'done'
export type Priority = 'low' | 'medium' | 'high'
export type View = 'table' | 'calendar' | 'dashboard'

export type Row = {
  id: string
  task: string
  status: Status
  priority: Priority
  /** ISO date, YYYY-MM-DD */
  due: string
  /** set while the row fades out */
  leaving?: boolean
  /** set for one render pass so the row animates in */
  fresh?: boolean
}

export type State = { rows: Row[]; log: string[]; seq: number }

export const STATUS_ORDER: Status[] = ['todo', 'progress', 'done']
export const PRIORITY_ORDER: Priority[] = ['low', 'medium', 'high']
export const STATUS_LABEL: Record<Status, string> = { todo: 'To do', progress: 'In progress', done: 'Done' }
export const PRIORITY_LABEL: Record<Priority, string> = { low: 'Low', medium: 'Medium', high: 'High' }

const STORAGE_KEY = 'tracker-landing-demo-v1'

export function isoDay(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
export function addDays(d: Date, n: number) {
  const c = new Date(d)
  c.setDate(c.getDate() + n)
  return c
}
export function parseDay(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function seed(today: Date): State {
  const r = (id: number, task: string, status: Status, priority: Priority, offset: number): Row => ({
    id: `r${id}`,
    task,
    status,
    priority,
    due: isoDay(addDays(today, offset)),
  })
  return {
    rows: [
      r(1, 'Grade essays (batch 1)', 'progress', 'high', 0),
      r(2, 'Plan field trip', 'todo', 'medium', -2),
      r(3, 'Order lab kits', 'done', 'low', -2),
      r(4, 'Parent meeting', 'todo', 'high', 3),
      r(5, 'Read chapter 4', 'todo', 'low', 0),
    ],
    log: [],
    seq: 6,
  }
}

type Action =
  | { type: 'add'; task: string; today: string }
  | { type: 'toggle'; id: string }
  | { type: 'cycleStatus'; id: string }
  | { type: 'cyclePriority'; id: string }
  | { type: 'markLeaving'; id: string }
  | { type: 'remove'; id: string }
  | { type: 'settle' }
  | { type: 'replace'; state: State }

const next = <T,>(order: T[], v: T) => order[(order.indexOf(v) + 1) % order.length]
const quote = (t: string) => `“${t.length > 28 ? t.slice(0, 27) + '…' : t}”`

function reducer(state: State, a: Action): State {
  const log = (msg: string) => [msg, ...state.log].slice(0, 6)
  const find = (id: string) => state.rows.find((r) => r.id === id)
  switch (a.type) {
    case 'add': {
      const row: Row = { id: `r${state.seq}`, task: a.task, status: 'todo', priority: 'medium', due: a.today, fresh: true }
      return { rows: [...state.rows, row], seq: state.seq + 1, log: log(`You added ${quote(a.task)}`) }
    }
    case 'toggle': {
      const row = find(a.id)
      if (!row) return state
      const status: Status = row.status === 'done' ? 'todo' : 'done'
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === a.id ? { ...r, status } : r)),
        log: log(status === 'done' ? `Marked ${quote(row.task)} done` : `Reopened ${quote(row.task)}`),
      }
    }
    case 'cycleStatus': {
      const row = find(a.id)
      if (!row) return state
      const status = next(STATUS_ORDER, row.status)
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === a.id ? { ...r, status } : r)),
        log: log(`Status of ${quote(row.task)} → ${STATUS_LABEL[status]}`),
      }
    }
    case 'cyclePriority': {
      const row = find(a.id)
      if (!row) return state
      const priority = next(PRIORITY_ORDER, row.priority)
      return {
        ...state,
        rows: state.rows.map((r) => (r.id === a.id ? { ...r, priority } : r)),
        log: log(`Priority of ${quote(row.task)} → ${PRIORITY_LABEL[priority]}`),
      }
    }
    case 'markLeaving':
      return { ...state, rows: state.rows.map((r) => (r.id === a.id ? { ...r, leaving: true } : r)) }
    case 'remove': {
      const row = find(a.id)
      if (!row) return state
      return { ...state, rows: state.rows.filter((r) => r.id !== a.id), log: log(`You deleted ${quote(row.task)}`) }
    }
    case 'settle':
      return state.rows.some((r) => r.fresh) ? { ...state, rows: state.rows.map(({ fresh, ...r }) => r) } : state
    case 'replace':
      return a.state
  }
}

function load(today: Date): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (Array.isArray(s.rows) && typeof s.seq === 'number') {
        return { rows: s.rows.map(({ leaving, fresh, ...r }) => r), log: Array.isArray(s.log) ? s.log : [], seq: s.seq }
      }
    }
  } catch {
    /* storage unavailable, fall back to in-memory */
  }
  return seed(today)
}

type Ctx = {
  ready: boolean
  today: Date
  todayIso: string
  rows: Row[]
  log: string[]
  view: View
  setView: (v: View) => void
  add: (task: string) => void
  toggle: (id: string) => void
  cycleStatus: (id: string) => void
  cyclePriority: (id: string) => void
  remove: (id: string) => void
  reset: () => void
}

const DemoContext = createContext<Ctx | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  // Dates depend on the visitor's clock, so the live data is only created after mount
  // (the static HTML renders a same-size placeholder: no hydration mismatch, no layout shift).
  const [today, setToday] = useState<Date | null>(null)
  const [state, dispatch] = useReducer(reducer, { rows: [], log: [], seq: 1 })
  const [view, setView] = useState<View>('table')

  useEffect(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    setToday(now)
    dispatch({ type: 'replace', state: load(now) })
  }, [])

  useEffect(() => {
    if (!today) return
    try {
      const { rows, log, seq } = state
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ rows: rows.filter((r) => !r.leaving).map(({ fresh, leaving, ...r }) => r), log, seq }),
      )
    } catch {
      /* ignore quota / privacy-mode errors */
    }
    if (state.rows.some((r) => r.fresh)) {
      const t = window.setTimeout(() => dispatch({ type: 'settle' }), 700)
      return () => window.clearTimeout(t)
    }
  }, [state, today])

  const remove = useCallback((id: string) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return dispatch({ type: 'remove', id })
    dispatch({ type: 'markLeaving', id })
    window.setTimeout(() => dispatch({ type: 'remove', id }), 220)
  }, [])

  const value = useMemo<Ctx>(() => {
    const t = today ?? new Date(2026, 0, 1)
    const todayIso = isoDay(t)
    return {
      ready: today !== null,
      today: t,
      todayIso,
      rows: state.rows,
      log: state.log,
      view,
      setView,
      add: (task: string) => {
        const clean = task.trim()
        if (clean) dispatch({ type: 'add', task: clean.slice(0, 80), today: todayIso })
      },
      toggle: (id) => dispatch({ type: 'toggle', id }),
      cycleStatus: (id) => dispatch({ type: 'cycleStatus', id }),
      cyclePriority: (id) => dispatch({ type: 'cyclePriority', id }),
      remove,
      reset: () => {
        dispatch({ type: 'replace', state: { ...seed(t), log: ['Demo reset'] } })
      },
    }
  }, [state, today, view, remove])

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used inside <DemoProvider>')
  return ctx
}

/** Derived numbers shared by the dashboard and the toolbar. */
export function useStats() {
  const { rows, todayIso } = useDemo()
  return useMemo(() => {
    const live = rows.filter((r) => !r.leaving)
    const total = live.length
    const done = live.filter((r) => r.status === 'done').length
    const open = live.filter((r) => r.status !== 'done')
    const dueToday = open.filter((r) => r.due === todayIso).length
    const overdue = open.filter((r) => r.due < todayIso).length
    const byStatus = STATUS_ORDER.map((s) => ({ key: s, n: live.filter((r) => r.status === s).length }))
    const byPriority = PRIORITY_ORDER.map((p) => ({ key: p, n: live.filter((r) => r.priority === p).length }))
    return { total, done, dueToday, overdue, byStatus, byPriority, doneRate: total ? Math.round((done / total) * 100) : 0 }
  }, [rows, todayIso])
}
