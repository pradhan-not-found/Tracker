import { downloads, REPO_URL, VERSION } from '@/lib/downloads'
import { faqPlain, faqs } from '@/lib/faq'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

/** Structured data: the app, the site and the FAQ (built from the same FAQ data as the page). */
export function JsonLd() {
  const org = { '@type': 'Organization', name: SITE_NAME, url: REPO_URL }
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/og-image.png`,
        applicationCategory: 'ProductivityApplication',
        operatingSystem: 'Windows 10, Windows 11, macOS 12+',
        softwareVersion: VERSION,
        downloadUrl: [
          downloads.windows.installer.url,
          downloads.windows.portable.url,
          downloads.mac.arm64.url,
          downloads.mac.x64.url,
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: org,
        publisher: org,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: org,
      },
      {
        '@type': 'FAQPage',
        '@id': `${SITE_URL}/#faq`,
        mainEntity: faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: faqPlain(f) },
        })),
      },
    ],
  }
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped, so it cannot close the script tag
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\u003c') }}
    />
  )
}
