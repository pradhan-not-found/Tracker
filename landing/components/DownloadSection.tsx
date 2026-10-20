'use client'

import { downloads, LATEST_RELEASE_URL, VERSION } from '@/lib/downloads'
import { usePlatform } from '@/lib/use-platform'
import { Spread } from './Spread'
import { AppleIcon, ArrowRight, DownloadIcon, WindowsIcon } from './icons'
import { DownloadLink } from './download/DownloadProvider'

export function DownloadSection() {
  const { os, macArch } = usePlatform()
  const macPrimary = macArch === 'x86' ? downloads.mac.x64 : downloads.mac.arm64
  const macSecondary = macArch === 'x86' ? downloads.mac.arm64 : downloads.mac.x64

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
              <p className="platform-meta">Windows 10/11 · 64-bit · .exe installer · {downloads.windows.installer.size}</p>
              <div className="platform-actions">
                <DownloadLink className="btn btn-solid" build={downloads.windows.installer}>
                  <DownloadIcon />
                  Download installer
                </DownloadLink>
                <DownloadLink className="text-link" build={downloads.windows.portable}>
                  Portable .exe <ArrowRight />
                </DownloadLink>
              </div>
              <p className="platform-file">{downloads.windows.installer.file}</p>
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
                <DownloadLink className="btn btn-solid" build={macPrimary}>
                  <DownloadIcon />
                  Download for {macPrimary.label}
                </DownloadLink>
                <DownloadLink className="text-link" build={macSecondary}>
                  {macSecondary.label} <ArrowRight />
                </DownloadLink>
              </div>
              <p className="platform-note">
                First launch: the macOS builds are unsigned, so right-click Tracker in Applications and choose{' '}
                <em>Open</em>.
              </p>
            </li>
          </ul>
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
