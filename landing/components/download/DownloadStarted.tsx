import { firstLaunchSteps, VERSION, type Build } from '@/lib/downloads'
import { AppleIcon, WindowsIcon } from '../icons'

export function PlatformGlyph({ build, size = 20 }: { build: Build; size?: number }) {
  return build.os === 'mac' ? <AppleIcon width={size} height={size} /> : <WindowsIcon width={size} height={size} />
}

/** File card + first-launch steps, shared by the dialog and the /download/ page. */
export function DownloadDetails({ build }: { build: Build }) {
  return (
    <>
      <div className="dl-file">
        <span className="icon-chip dl-chip" aria-hidden>
          <PlatformGlyph build={build} />
        </span>
        <div className="dl-file-text">
          <p className="dl-file-title">{build.title}</p>
          <p className="dl-file-name">{build.file}</p>
          <p className="dl-file-meta">
            {build.size} <span aria-hidden>·</span> v{VERSION} <span aria-hidden>·</span> {build.requirements}
          </p>
        </div>
      </div>
      <div className="dl-steps">
        <p className="dl-steps-title">First launch</p>
        <ul>
          {firstLaunchSteps(build).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </>
  )
}
