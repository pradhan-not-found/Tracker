import { downloads, REPO_URL, VERSION } from '@/lib/downloads'
import { faqPlain, faqs } from '@/lib/faq'
import { AUTHOR, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site'

/** Structured data: the app, the site and the FAQ (built from the same FAQ data as the page). */
export function JsonLd() {
  const person = { '@type': 'Person', '@id': `${SITE_URL}/#author`, name: AUTHOR.name, url: AUTHOR.url, sameAs: [AUTHOR.url] }
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
        screenshot: `${SITE_URL}/og-image.png`,
        applicationCategory: 'ProductivityApplication',
        applicationSubCategory: 'Database',
        operatingSystem: 'Windows 10, Windows 11, macOS 12+',
        softwareVersion: VERSION,
        softwareRequirements: 'Windows 10 or 11 (64-bit), or macOS 12 or later',
        releaseNotes: `${REPO_URL}/releases/tag/v${VERSION}`,
        isAccessibleForFree: true,
        inLanguage: 'en',
        featureList: [
          'Templates for to-do lists, marks, attendance and inventory',
          'Typed columns: text, number, marks, date, checkbox, status, file, email, link',
          'Table, calendar and dashboard views',
          'Activity log of every change and reminders for due items',
          'Import and export CSV, Excel and JSON',
          'Stored locally with automatic backups; works offline',
        ],
        downloadUrl: [
          downloads.windows.installer.url,
          downloads.windows.portable.url,
          downloads.mac.arm64.url,
          downloads.mac.x64.url,
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
        author: person,
        publisher: person,
        codeRepository: REPO_URL,
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        inLanguage: 'en',
        publisher: person,
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
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph).replace(/</g, '\\u003c') }}
    />
  )
}
