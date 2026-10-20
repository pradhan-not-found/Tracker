'use client'

import { useRef, type KeyboardEvent } from 'react'
import { ActivityIcon, CalendarIcon, ChartIcon, FolderIcon, HomeIcon, MenuIcon, PlusIcon, SearchIcon, TableIcon } from '../icons'
import { useDemo, useStats, type View } from './store'
import { DemoCalendar, DemoDashboard, DemoTable } from './views'

const VIEWS: { id: View; label: string; Icon: typeof TableIcon }[] = [
  { id: 'table', label: 'Table', Icon: TableIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'dashboard', label: 'Dashboard', Icon: ChartIcon },
]

/** A live, in-browser replica of the Tracker window. */
export function DemoApp() {
  const { ready, view, setView, log, reset } = useDemo()
  const stats = useStats()
  const inputRef = useRef<HTMLInputElement>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])

  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = VIEWS.findIndex((v) => v.id === view)
    let n = i
    if (e.key === 'ArrowRight') n = (i + 1) % VIEWS.length
    else if (e.key === 'ArrowLeft') n = (i - 1 + VIEWS.length) % VIEWS.length
    else if (e.key === 'Home') n = 0
    else if (e.key === 'End') n = VIEWS.length - 1
    else return
    e.preventDefault()
    setView(VIEWS[n].id)
    tabRefs.current[n]?.focus()
  }

  const addRecord = () => {
    if (view !== 'table') setView('table')
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  return (
    <div className="demo">
      <div className="demo-caption">
        <span className="demo-badge">Live demo</span>
        <span>Try it: add, tick and switch views. Nothing leaves your browser.</span>
        <button type="button" className="demo-reset" onClick={reset} disabled={!ready}>
          Reset demo
        </button>
      </div>

      <section className="window app-ui" aria-label="Interactive Tracker demo">
        <aside className="win-side" aria-label="Demo sidebar">
          <div className="win-titlebar">
            <span className="traffic" aria-hidden>
              <i className="t-red" />
              <i className="t-yellow" />
              <i className="t-green" />
            </span>
          </div>
          <div className="win-brand">
            <img src="logo-color.png" alt="" width={20} height={20} />
            <span>Tracker</span>
          </div>
          <ul className="side-actions" aria-hidden>
            <li>
              <MenuIcon /> Menu
            </li>
            <li>
              <PlusIcon /> New workspace
            </li>
            <li>
              <SearchIcon /> Search
            </li>
            <li>
              <HomeIcon /> Home
            </li>
            <li>
              <ActivityIcon /> Activity
            </li>
          </ul>
          <p className="side-label" aria-hidden>
            Workspaces
          </p>
          <ul className="side-list" aria-hidden>
            <li className="active">
              <FolderIcon /> Class 10-A
            </li>
          </ul>
          <p className="side-label" aria-hidden>
            Sheets
          </p>
          <ul className="side-list" aria-hidden>
            <li className="active">
              <TableIcon width={13} height={13} /> To-do list
            </li>
          </ul>
        </aside>

        <div className="win-main">
          <div className="win-panel">
            <div className="panel-head">
              <p className="panel-crumb">
                <span>Class 10-A</span>
                <span aria-hidden>/</span>
                <strong>To-do list</strong>
              </p>
              <div className="seg" role="tablist" aria-label="Demo views" onKeyDown={onTabKey}>
                {VIEWS.map((v, i) => (
                  <button
                    key={v.id}
                    ref={(el) => {
                      tabRefs.current[i] = el
                    }}
                    type="button"
                    role="tab"
                    id={`demo-tab-${v.id}`}
                    aria-selected={view === v.id}
                    aria-controls="demo-panel"
                    tabIndex={view === v.id ? 0 : -1}
                    className={view === v.id ? 'on' : ''}
                    onClick={() => setView(v.id)}
                  >
                    <v.Icon width={12} height={12} /> {v.label}
                  </button>
                ))}
              </div>
              <button type="button" className="rich-btn" onClick={addRecord}>
                <PlusIcon /> Add record
              </button>
            </div>

            <p className="panel-meta">
              {stats.total} record{stats.total === 1 ? '' : 's'} · {stats.done} done
              {stats.overdue > 0 && <span className="chip-warn">{stats.overdue} overdue</span>}
            </p>

            <div className="demo-stage" id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${view}`}>
              {!ready ? (
                <div className="demo-loading" aria-hidden />
              ) : (
                <div className="demo-view" key={view}>
                  {view === 'table' && <DemoTable inputRef={inputRef} />}
                  {view === 'calendar' && <DemoCalendar />}
                  {view === 'dashboard' && <DemoDashboard />}
                </div>
              )}
            </div>

            <p className="panel-status" aria-live="polite">
              <span className="saved-dot" aria-hidden />
              <span>All changes saved</span>
              {log[0] && (
                <span className="toast" key={log[0] + log.length}>
                  · {log[0]}
                </span>
              )}
            </p>
          </div>
        </div>
      </section>
      <noscript>
        <p className="demo-noscript">The live demo needs JavaScript. Download Tracker to try the real thing.</p>
      </noscript>
    </div>
  )
}
