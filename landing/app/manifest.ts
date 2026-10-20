import type { MetadataRoute } from 'next'
import { BASE_PATH, SITE_DESCRIPTION, SITE_TITLE, THEME_BLUE } from '@/lib/site'

export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_TITLE,
    short_name: 'Tracker',
    description: SITE_DESCRIPTION,
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: 'standalone',
    background_color: THEME_BLUE,
    theme_color: THEME_BLUE,
    icons: [
      { src: `${BASE_PATH}/icons/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: `${BASE_PATH}/icons/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: `${BASE_PATH}/icons/maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
