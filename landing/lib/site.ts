/** Public site URL (include the GitHub Pages sub-path if any). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://pradhan-not-found.github.io/Tracker').replace(/\/$/, '')
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || ''
export const SITE_NAME = 'Tracker'
export const SITE_TITLE = 'Tracker: private, local-first databases for Windows and macOS'
export const SITE_DESCRIPTION =
  'Tracker is a free, private desktop app for building your own databases: to-dos, marks, attendance and inventory, with table, calendar and dashboard views.'
export const THEME_BLUE = '#C8DDFC'
