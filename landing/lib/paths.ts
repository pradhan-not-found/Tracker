import { BASE_PATH } from './site'

/** Prefixes a public asset path with the deploy base path (e.g. "/Tracker" on GitHub Pages, "" at a domain root). */
export const asset = (p: string) => `${BASE_PATH}/${p.replace(/^\//, '')}`
