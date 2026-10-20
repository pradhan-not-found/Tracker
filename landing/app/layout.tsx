import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { RevealObserver } from '@/components/RevealObserver'
import { RELEASES_URL } from '@/lib/downloads'
import { AUTHOR, INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, THEME_BLUE, VERIFICATION } from '@/lib/site'
import './globals.css'
import './demo.css'

const switzer = localFont({
  src: './fonts/Switzer-Variable.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-switzer',
})

const ogImage = { url: 'og-image.png', width: 1200, height: 630, alt: 'Tracker: your data, organised your way. Private, local-first databases for Windows and macOS.' }

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  title: { default: SITE_TITLE, template: '%s · Tracker' },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'local-first database',
    'offline spreadsheet',
    'to-do list app',
    'attendance tracker',
    'marks tracker',
    'inventory app',
    'Airtable alternative',
    'Excel alternative',
    'offline database app',
    'private to-do app',
    'gradebook app',
    'free database software',
    'Windows',
    'macOS',
  ],
  authors: [{ name: AUTHOR.name, url: AUTHOR.url }],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  category: 'productivity',
  alternates: {
    canonical: './',
    types: { 'application/atom+xml': [{ url: `${RELEASES_URL}.atom`, title: 'Tracker releases' }] },
  },
  robots: INDEXABLE
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
      }
    : { index: false, follow: false, googleBot: { index: false, follow: false } },
  verification: {
    google: VERIFICATION.google,
    other: VERIFICATION.bing ? { 'msvalidate.01': VERIFICATION.bing } : undefined,
  },
  formatDetection: { telephone: false, email: false, address: false },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'en_US',
    url: './',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [ogImage],
  },
}

export const viewport: Viewport = {
  themeColor: THEME_BLUE,
  colorScheme: 'light',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={switzer.variable} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Enables reveal animations only when JS runs, so content is never hidden without it. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
        <RevealObserver />
      </body>
    </html>
  )
}
