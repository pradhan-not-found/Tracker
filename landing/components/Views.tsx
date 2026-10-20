'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import { Spread } from './Spread'
import { CalendarDayIcon, DashboardIcon, GridIcon } from './icons'
import { useDemo } from './demo/store'
import { DemoCalendar, DemoDashboard, DemoTable } from './demo/views'

const tabs = [
  { id: 'table', label: 'Table', Icon: GridIcon, blurb: 'A fast spreadsheet grid with typed cells. It shares the live demo data, so edit it here too.' },
  { id: 'calendar', label: 'Calendar', Icon: CalendarDayIcon, blurb: 'A month view on any date column, so you see what’s due at a glance.' },
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon, blurb: 'KPIs, status breakdowns and trends, computed live from your rows.' },
] as const

type TabId = (typeof tabs)[number]['id']

export function Views() {
  const [active, setActive] = useState<TabId>('table')
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const { ready } = useDemo()

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const idx = tabs.findIndex((t) => t.id === active)
    let next = idx
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (idx + 1) % tabs.length
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = tabs.length - 1
    else return
    e.preventDefault()
    setActive(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <Spread id="views" label="Three views" title={['One sheet.', 'Three ways to see it.']}>
      <div className="views">
        <div className="views-index" data-reveal>
          <div
            className="tabs"
            role="tablist"
            aria-label="Sheet views"
            aria-orientation="vertical"
            onKeyDown={onKey}
          >
            {tabs.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  refs.current[i] = el
                }}
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={active === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={active === t.id ? 0 : -1}
                className={`tab ${active === t.id ? 'is-active' : ''}`}
                onClick={() => setActive(t.id)}
                type="button"
                data-reveal-item
                style={{ ['--i' as string]: i }}
              >
                <span className="icon-chip" aria-hidden>
                  <t.Icon />
                </span>
                <span className="tab-text">
                  <span className="tab-label">{t.label}</span>
                  <span className="tab-blurb">{t.blurb}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="view-stage" data-reveal>
          <div className="view-window app-ui" data-reveal-item style={{ ['--i' as string]: 1 }}>
            {tabs.map((t) => (
              <div
                key={t.id}
                role="tabpanel"
                id={`panel-${t.id}`}
                aria-labelledby={`tab-${t.id}`}
                className={`view-pane ${active === t.id ? 'is-active' : ''}`}
                aria-hidden={active !== t.id}
                inert={active !== t.id}
              >
                {!ready ? (
                  <div className="demo-loading" aria-hidden />
                ) : (
                  <>
                    {t.id === 'table' && <DemoTable />}
                    {t.id === 'calendar' && <DemoCalendar />}
                    {t.id === 'dashboard' && <DemoDashboard />}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Spread>
  )
}
