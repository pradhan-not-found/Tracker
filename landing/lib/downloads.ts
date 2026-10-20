/**
 * Single source of truth for release download links.
 * Bump VERSION after publishing a new GitHub release.
 */
export const REPO = 'pradhan-not-found/Tracker'
export const VERSION = '2.1.0'

export const REPO_URL = `https://github.com/${REPO}`
export const RELEASES_URL = `${REPO_URL}/releases`
export const LATEST_RELEASE_URL = `${RELEASES_URL}/latest`

const asset = (name: string) => `${RELEASES_URL}/download/v${VERSION}/${name}`

export const downloads = {
  windows: {
    installer: {
      label: 'Windows installer',
      file: `Tracker-${VERSION}-windows-x64-setup.exe`,
      url: asset(`Tracker-${VERSION}-windows-x64-setup.exe`),
    },
    portable: {
      label: 'Portable .exe',
      file: `Tracker-${VERSION}-windows-x64-portable.exe`,
      url: asset(`Tracker-${VERSION}-windows-x64-portable.exe`),
    },
  },
  mac: {
    arm64: {
      label: 'Apple Silicon',
      file: `Tracker-${VERSION}-macos-arm64.dmg`,
      url: asset(`Tracker-${VERSION}-macos-arm64.dmg`),
    },
    x64: {
      label: 'Intel Mac',
      file: `Tracker-${VERSION}-macos-x64.dmg`,
      url: asset(`Tracker-${VERSION}-macos-x64.dmg`),
    },
  },
  fallback: LATEST_RELEASE_URL,
} as const

export type Platform = 'windows' | 'mac' | 'other'
