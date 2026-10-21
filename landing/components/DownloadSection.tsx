'use client'

import { downloads, LATEST_RELEASE_URL, VERSION } from '@/lib/downloads'
import { usePlatform } from '@/lib/use-platform'
import { Spread } from './Spread'
import { AppleIcon, WindowsIcon } from './icons'
import { SplitDownload, type SplitOption } from './download/SplitDownload'

const win = downloads.windows
const mac = downloads.mac

const windowsOptions: SplitOption[] = [
  { build: win.installer, title: 'Installer', sub: `Recommended · ${win.installer.size}` },
  { build: win.portable, title: 'Portable', sub: `No install · ${win.portable.size}` },
]
const macOptions: SplitOption[] = [
  { build: mac.arm64, title: 'Apple Silicon', sub: `M1 and later · ${mac.arm64.size}` },
  { build: mac.x64, title: 'Intel', sub: `Intel Macs · ${mac.x64.size}` },
]

export function DownloadSection() {
  const { os, macArch } = usePlatform()
  const macPrimary = macArch === 'x86' ? mac.x64 : mac.arm64

  return (
    <Spread
      id="download"
      label={`Download · v${VERSION}`}
      title={['Get Tracker.']}
    >
      <div className="split">
        <p className="split-intro" data-reveal>
          <span data-reveal-item>Free, offline and ready in under a minute. Pick your system below.</span>
        </p>
        <div>
          <ul className="platforms" data-reveal>
            <li className={`platform ${os === 'windows' ? 'is-detected' : ''}`} data-reveal-item style={{ ['--i' as string]: 0 }}>
              <div className="platform-head">
                <h3 className="platform-name">
                  <WindowsIcon width={22} height={22} /> Windows
                </h3>
                {os === 'windows' && <span className="detected">Your system</span>}
              </div>
              <p className="platform-meta">Windows 10/11 · 64-bit · .exe installer · {win.installer.size}</p>
              <div className="platform-actions">
                <SplitDownload primary={win.installer} label="Download installer" options={windowsOptions} />
              </div>
            </li>

            <li className={`platform ${os === 'mac' ? 'is-detected' : ''}`} data-reveal-item style={{ ['--i' as string]: 1 }}>
              <div className="platform-head">
                <h3 className="platform-name">
                  <AppleIcon width={22} height={22} /> macOS
                </h3>
                {os === 'mac' && <span className="detected">Your system</span>}
              </div>
              <p className="platform-meta">macOS 12+ · Apple Silicon &amp; Intel · .dmg · {macPrimary.size}</p>
              <div className="platform-actions">
                <SplitDownload primary={macPrimary} label={`Download for ${macPrimary.label}`} options={macOptions} />
              </div>
              <p className="platform-note">
                First launch: if macOS says it can’t verify Tracker, click <em>Done</em>, then open{' '}
                <em>System Settings › Privacy &amp; Security</em> and choose <em>Open Anyway</em>. Only needed once.
              </p>
            </li>
          </ul>
          <p className="update-note">
            <strong>Staying up to date:</strong> Tracker checks every time it opens and updates itself in a
            moment. Updates never touch your data.
          </p>
          <p className="fallback">
            Download not starting? Every build is on the{' '}
            <a href={LATEST_RELEASE_URL} target="_blank" rel="noopener noreferrer">
              latest GitHub release
            </a>
            .
          </p>
        </div>
      </div>
    </Spread>
  )
}
