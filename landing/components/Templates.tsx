import { Spread } from './Spread'
import { AwardIcon, BoxIcon, CheckSquareIcon, TablePlusIcon, UsersCheckIcon } from './icons'

const templates = [
  { name: 'To-do list', Icon: CheckSquareIcon, cols: 'Task · Status · Priority · Due date · Assignee · Notes', note: 'Reminders when things are due' },
  { name: 'Marks & grades', Icon: AwardIcon, cols: 'Student · Roll no · Subject · Marks / 100 · Result', note: 'Averages and distribution' },
  { name: 'Attendance', Icon: UsersCheckIcon, cols: 'Name · Member ID · Date · Status (Present, Absent, Late, Leave)', note: 'Laid out on the calendar' },
  { name: 'Inventory', Icon: BoxIcon, cols: 'Item · SKU · Category · Quantity · Unit price · Photo', note: 'Photos and files per row' },
  { name: 'Blank sheet', Icon: TablePlusIcon, cols: 'Your columns, your rules', note: 'Or import a CSV / Excel file' },
]

export function Templates() {
  return (
    <Spread
      id="templates"
      label="Templates"
      title={['Start from a template,', 'or a blank page.']}
    >
      <div className="split">
        <p className="split-intro" data-reveal>
          <span data-reveal-item>
            Each template comes with the right columns already set up. Preview it before anything is created, then
            make it yours.
          </span>
        </p>
        <ul className="rows" data-reveal>
          {templates.map((t, i) => (
            <li className="row" key={t.name} data-reveal-item style={{ ['--i' as string]: i }}>
              <span className="icon-chip" aria-hidden>
                <t.Icon />
              </span>
              <h3 className="row-title">{t.name}</h3>
              <p className="row-cols">{t.cols}</p>
              <p className="row-note">{t.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </Spread>
  )
}
