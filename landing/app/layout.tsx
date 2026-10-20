import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'
import { RevealObserver } from '@/components/RevealObserver'
import { REPO_URL } from '@/lib/downloads'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, SITE_URL, THEME_BLUE } from '@/lib/site'
import './globals.css'
import './demo.css'

const switzer = localFont({
  src: './fonts/Switzer-Variable.ttf',
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
    'Windows',
    'macOS',
  ],
  authors: [{ name: 'Tracker', url: REPO_URL }],
  creator: 'Tracker',
  publisher: 'Tracker',
  category: 'productivity',
  alternates: { canonical: './' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
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
