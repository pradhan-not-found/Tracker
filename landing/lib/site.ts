/**
 * Public site URL, used for canonical, Open Graph, sitemap, robots and JSON-LD.
 * Order: NEXT_PUBLIC_SITE_URL (custom domain) → Vercel production domain → Vercel preview URL → localhost.
 * Include the base path in NEXT_PUBLIC_SITE_URL if the site is served from a sub-path.
 */
function resolveSiteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}

export const SITE_URL = resolveSiteUrl().replace(/\/$/, '')
/** Deploy sub-path, e.g. "/Tracker" for a GitHub Pages project site. Empty (domain root) by default, as on Vercel. */
export const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH || '').replace(/\/$/, '')
export const SITE_NAME = 'Tracker'
export const SITE_TITLE = 'Tracker: private, local-first databases for Windows and macOS'
export const SITE_DESCRIPTION =
  'Tracker is a free, private desktop app for building your own databases: to-dos, marks, attendance and inventory, with table, calendar and dashboard views.'
export const THEME_BLUE = '#C8DDFC'
