'use client'

import { downloads, VERSION } from '@/lib/downloads'
import { usePlatform } from '@/lib/use-platform'
import { AppleIcon, WindowsIcon } from './icons'
import { DownloadLink } from './download/DownloadProvider'

/** Hero CTAs. The button matching the visitor's OS is solid; the other becomes a hairline outline. */
export function PlatformButtons() {
  const { os, macArch } = usePlatform()
  const winSolid = os !== 'mac'
  const macSolid = os !== 'windows'
  const macLink = macArch === 'x86' ? downloads.mac.x64 : downloads.mac.arm64
  const macOther = macArch === 'x86' ? downloads.mac.arm64 : downloads.mac.x64

  return (
    <div className="ctas" data-os={os ?? 'unknown'}>
      <div className="cta-row">
        <DownloadLink build={downloads.windows.installer} className={`btn ${winSolid ? 'btn-solid' : 'btn-line'}`}>
          <WindowsIcon />
          Download for Windows
        </DownloadLink>
        <DownloadLink build={macLink} className={`btn ${macSolid ? 'btn-solid' : 'btn-line'}`}>
          <AppleIcon />
          Download for macOS
        </DownloadLink>
      </div>
      <p className="cta-meta">
        Free <span aria-hidden>·</span> Works offline <span aria-hidden>·</span> v{VERSION}
        {os === 'mac' && (
          <>
            {' '}
            <span aria-hidden>·</span> <DownloadLink build={macOther}>{macOther.label} build</DownloadLink>
          </>
        )}
      </p>
    </div>
  )
}
