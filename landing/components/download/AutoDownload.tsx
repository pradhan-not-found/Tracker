'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { buildList, builds, isBuildId, LATEST_RELEASE_URL, VERSION, type Build } from '@/lib/downloads'
import { detectMacArch, detectOS } from '@/lib/use-platform'
import { startDownload } from '@/lib/start-download'
import { Display, Meta } from '../Spread'
import { DownloadIcon } from '../icons'
import { DownloadLink } from './DownloadProvider'
import { DownloadDetails, PlatformGlyph } from './DownloadStarted'

type Phase =
  | { kind: 'detecting' }
  | { kind: 'starting'; build: Build }
  | { kind: 'started'; build: Build }
  | { kind: 'choose' }

const START_DELAY = 800

/** Picks the build: ?platform= wins, then the detected OS (Apple Silicon unless the browser reports Intel). */
async function pickBuild(): Promise<Build | null> {
  const forced = new URLSearchParams(window.location.search).get('platform')
  if (isBuildId(forced)) return builds[forced]
  const os = detectOS()
  if (os === 'windows') return builds.windows
  if (os === 'mac') return (await detectMacArch()) === 'x86' ? builds['mac-intel'] : builds.mac
  return null
}

const headline: Record<Phase['kind'], string[]> = {
  detecting: ['Getting your', 'download ready.'],
  starting: ['Getting your', 'download ready.'],
  started: ['Your download', 'has started.'],
  choose: ['Choose your', 'download.'],
}

export function AutoDownload() {
  const [phase, setPhase] = useState<Phase>({ kind: 'detecting' })
  const fired = useRef(false)

  useEffect(() => {
    let timer = 0
    let cancelled = false
    pickBuild().then((build) => {
      if (cancelled) return
      if (!build) {
        setPhase({ kind: 'choose' })
        return
      }
      setPhase({ kind: 'starting', build })
      timer = window.setTimeout(() => {
        if (fired.current) return // never start twice (StrictMode remounts effects in dev)
        fired.current = true
        startDownload(build.url)
        setPhase({ kind: 'started', build })
      }, START_DELAY)
    })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  const active = phase.kind === 'starting' || phase.kind === 'started' ? phase.build : null

  return (
    <>
      <section className="spread dl-page" id="top" aria-labelledby="dl-page-title">
        <Meta label={`Download · v${VERSION}`} />
        <div aria-live="polite">
          <Display as="h1" id="dl-page-title" lines={headline[phase.kind]} />
        </div>

        <div className="split">
          <div className="split-intro">
            <p>
              {phase.kind === 'choose'
                ? 'Tracker is a desktop app for Windows and macOS. Pick a build below, or open this page on your computer and the right one starts by itself.'
                : phase.kind === 'started'
                  ? 'The file is saving to your Downloads folder. Keep this page open for the setup steps.'
                  : 'Detecting your system and picking the right build.'}
            </p>
            <p className="dl-back">
              <Link className="text-link" href="/">
                Back to home
              </Link>
            </p>
          </div>

          <div>
            {active ? (
              <div className="glass dl-card">
                <p className="dl-kicker">
                  {phase.kind === 'starting' ? 'Starting download' : 'Downloading'}
                </p>
                <DownloadDetails build={active} />
                <div className="dl-foot">
                  <span>
                    Download didn’t start?{' '}
                    <a className="text-link" href={active.url}>
                      Try again
                    </a>
                  </span>
                  <a className="text-link" href="#all-builds">
                    Other platforms
                  </a>
                </div>
              </div>
            ) : (
              <div className="glass dl-card dl-card-empty">
                <p className="dl-kicker">
                  {phase.kind === 'choose' ? 'Nothing downloaded yet' : 'Detecting your system'}
                </p>
                {phase.kind === 'choose' && (
                  <p className="dl-sub">
                    This device isn’t Windows or macOS, so no download was started. Every build is listed below.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="spread dl-builds" id="all-builds" aria-labelledby="all-builds-title">
        <Meta label="All builds" />
        <h2 id="all-builds-title" className="dl-builds-title">
          Every build of v{VERSION}
        </h2>
        <ul className="dl-grid">
          {buildList.map((b) => {
            const current = active?.id === b.id
            return (
              <li key={b.id} className={`platform dl-build ${current ? 'is-detected' : ''}`}>
                <div className="platform-head">
                  <h3 className="platform-name">
                    <PlatformGlyph build={b} /> {b.title.replace('Tracker for ', '')}
                  </h3>
                  {current && <span className="detected">{phase.kind === 'started' ? 'Downloading' : 'Your system'}</span>}
                </div>
                <p className="platform-meta">
                  {b.requirements} · {b.size}
                </p>
                <DownloadLink className={`btn ${current ? 'btn-line' : 'btn-solid'}`} build={b}>
                  <DownloadIcon />
                  Download
                </DownloadLink>
                <p className="platform-file">{b.file}</p>
              </li>
            )
          })}
        </ul>
        <p className="fallback">
          Release notes and older versions are on the{' '}
          <a href={LATEST_RELEASE_URL} target="_blank" rel="noopener noreferrer">
            GitHub releases page
          </a>
          .
        </p>
      </section>
    </>
  )
}
