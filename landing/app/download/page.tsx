import type { Metadata } from 'next'
import { Nav } from '@/components/Nav'
import { Footer } from '@/components/Footer'
import { PageArcs } from '@/components/Arcs'
import { DownloadProvider } from '@/components/download/DownloadProvider'
import { AutoDownload } from '@/components/download/AutoDownload'
import { INDEXABLE, SITE_URL } from '@/lib/site'

const title = 'Download Tracker'
const description =
  'Download Tracker for Windows or macOS. The right build for your computer starts automatically: free, offline, no account.'
const ogImage = {
  url: `${SITE_URL}/og-image.png`,
  width: 1200,
  height: 630,
  alt: 'Tracker: private, local-first databases for Windows and macOS.',
}

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: 'download/' },
  robots: { index: INDEXABLE, follow: INDEXABLE },
  openGraph: { type: 'website', siteName: 'Tracker', url: 'download/', title, description, images: [ogImage] },
  twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
}

export default function DownloadPage() {
  return (
    <DownloadProvider otherPlatformsHref="#all-builds">
      <Nav home={false} />
      <div className="page">
        <PageArcs />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Tracker', item: `${SITE_URL}/` },
                { '@type': 'ListItem', position: 2, name: 'Download', item: `${SITE_URL}/download/` },
              ],
            }).replace(/</g, '\\u003c'),
          }}
        />
        <main id="main" tabIndex={-1}>
          <AutoDownload />
        </main>
        <Footer home={false} />
      </div>
    </DownloadProvider>
  )
}
