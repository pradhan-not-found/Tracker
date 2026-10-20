import { Spread } from './Spread'
import { BellIcon, ColumnsIcon, GridIcon, HistoryIcon, LayersIcon, SwapIcon } from './icons'
import { DemoApp } from './demo/DemoApp'

const features = [
  {
    Icon: GridIcon,
    title: 'Build any tracker',
    body: 'Start from a To-do, Marks, Attendance or Inventory template, or a blank sheet with your own columns.',
  },
  {
    Icon: ColumnsIcon,
    title: 'Typed columns',
    body: 'Text, number, marks out of N, date, checkbox, status, file uploads, email and URL. Each one is validated and formatted.',
  },
  {
    Icon: LayersIcon,
    title: 'Three views per sheet',
    body: 'A spreadsheet grid, a month calendar on any date column, and a dashboard of KPIs and trends.',
  },
  {
    Icon: HistoryIcon,
    title: 'Everything tracked',
    body: 'An activity log records every create, edit and delete, with a full history for each row.',
  },
  {
    Icon: BellIcon,
    title: 'Reminders',
    body: 'Get notified about overdue and due-today items, so nothing slips past a deadline.',
  },
  {
    Icon: SwapIcon,
    title: 'Import & export',
    body: 'Bring in CSV or Excel. Export CSV, Excel (.xlsx) or JSON, for one sheet or the whole workspace.',
  },
]

export function Features() {
  return (
    <Spread id="features" label="The app" title={['A spreadsheet that knows', 'what your data is.']}>
      <div className="mockup-stage" data-reveal>
        <div data-reveal-item>
          <DemoApp />
        </div>
      </div>
      <div className="split">
        <p className="split-intro" data-reveal>
          <span data-reveal-item>
            The flexibility of Excel and the structure of a database, without accounts, subscriptions or a browser
            tab.
          </span>
        </p>
        <ul className="entries entries-2" data-reveal>
          {features.map((f, i) => (
            <li className="entry" key={f.title} data-reveal-item style={{ ['--i' as string]: i }}>
              <span className="icon-chip" aria-hidden>
                <f.Icon />
              </span>
              <h3 className="entry-title">{f.title}</h3>
              <p className="entry-body">{f.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Spread>
  )
}
