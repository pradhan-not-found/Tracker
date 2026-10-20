/**
 * Single source of truth for release download links.
 * Bump VERSION (shown in copy and JSON-LD) and the sizes, if they change much, after a release.
 * Asset URLs are absolute GitHub URLs, so they work from any host.
 */
export const REPO = 'pradhan-not-found/Tracker'
export const VERSION = '2.4.3'

export const REPO_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${REPO_URL}/releases`
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`

/** Asset names carry no version, so these links always resolve to the latest published release. */
const asset = (name: string) => `${LATEST_RELEASE_URL}/download/${name}`

export type BuildId = 'windows' | 'portable' | 'mac' | 'mac-intel'

export type Build = {
  id: BuildId
  os: 'windows' | 'mac'
  /** Short label used in links, e.g. "Apple Silicon". */
  label: string
  /** Full name used in the "download started" UI. */
  title: string
  requirements: string
  file: string
  url: string
  /** Approximate size, shown to the user. */
  size: string
}

const build = (b: Omit<Build, 'url'>): Build => ({ ...b, url: asset(b.file) })

export const builds: Record<BuildId, Build> = {
  windows: build({
    id: 'windows',
    os: 'windows',
    label: 'Windows installer',
    title: 'Tracker for Windows',
    requirements: 'Windows 10/11 · 64-bit',
    file: 'Tracker-windows-x64-setup.exe',
    size: '121 MB',
  }),
  portable: build({
    id: 'portable',
    os: 'windows',
    label: 'Portable .exe',
    title: 'Tracker for Windows, portable',
    requirements: 'Windows 10/11 · 64-bit · no install',
    file: 'Tracker-windows-x64-portable.exe',
    size: '120 MB',
  }),
  mac: build({
    id: 'mac',
    os: 'mac',
    label: 'Apple Silicon',
    title: 'Tracker for macOS, Apple Silicon',
    requirements: 'macOS 12+ · M-series Macs',
    file: 'Tracker-macos-arm64.dmg',
    size: '131 MB',
  }),
  'mac-intel': build({
    id: 'mac-intel',
    os: 'mac',
    label: 'Intel Mac',
    title: 'Tracker for macOS, Intel',
    requirements: 'macOS 12+ · Intel Macs',
    file: 'Tracker-macos-x64.dmg',
    size: '137 MB',
  }),
}

export const buildList: Build[] = [builds.windows, builds.portable, builds.mac, builds['mac-intel']]

export const isBuildId = (v: string | null | undefined): v is BuildId => !!v && v in builds

/** First-launch steps shown after a download starts. */
export function firstLaunchSteps(b: Build): string[] {
  if (b.id === 'portable')
    return [
      'Open the downloaded .exe. There is nothing to install.',
      'If SmartScreen appears, choose More info, then Run anyway.',
      'Tracker opens. Keep the file anywhere, even on a USB drive.',
    ]
  if (b.os === 'windows')
    return [
      'Open the installer from your Downloads.',
      'If SmartScreen appears, choose More info, then Run anyway.',
      'Tracker installs and opens. Find it in the Start menu.',
    ]
  return [
    'Open the .dmg from your Downloads.',
    'Drag Tracker into the Applications folder.',
    'The first time, right-click Tracker and choose Open.',
  ]
}

export const downloads = {
  windows: { installer: builds.windows, portable: builds.portable },
  mac: { arm64: builds.mac, x64: builds['mac-intel'] },
  fallback: LATEST_RELEASE_URL,
} as const

export type Platform = 'windows' | 'mac' | 'other'
