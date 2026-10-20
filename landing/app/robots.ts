import type { MetadataRoute } from 'next'
import { INDEXABLE, SITE_URL } from '@/lib/site'

export const dynamic = 'force-static'

export default function robots(): MetadataRoute.Robots {
  return {
    // Preview deploys tell crawlers to stay away; production is open.
    rules: INDEXABLE ? [{ userAgent: '*', allow: '/' }] : [{ userAgent: '*', disallow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
