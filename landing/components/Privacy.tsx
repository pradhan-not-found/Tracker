import { Spread } from './Spread'
import { DatabaseIcon, LockIcon, SunMoonIcon, WifiOffIcon } from './icons'

const points = [
  { Icon: DatabaseIcon, title: 'Stored in SQLite, on your disk', body: 'One local database file that you own. Back it up, move it or delete it.' },
  { Icon: WifiOffIcon, title: 'Works fully offline', body: 'No connection needed to create, edit or export. Ever.' },
  { Icon: LockIcon, title: 'No account, no cloud', body: 'No sign-up, no sync servers, no tracking. Nothing leaves the machine.' },
  { Icon: SunMoonIcon, title: 'Light & dark themes', body: 'Easy on the eyes at any hour. Follow your system or choose your own.' },
]

export function Privacy() {
  return (
    <Spread id="privacy" label="Local-first" title={['Your data never', 'leaves your desk.']}>
      <div className="split">
        <p className="split-intro" data-reveal>
          <span data-reveal-item>
            Tracker is a desktop app, not a website. Your sheets live in a SQLite database on your own computer:
            fast, searchable and available even on a plane.
          </span>
        </p>
        <ul className="entries entries-2" data-reveal>
          {points.map((p, i) => (
            <li className="entry" key={p.title} data-reveal-item style={{ ['--i' as string]: i }}>
              <span className="icon-chip" aria-hidden>
                <p.Icon />
              </span>
              <h3 className="entry-title">{p.title}</h3>
              <p className="entry-body">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Spread>
  )
}
