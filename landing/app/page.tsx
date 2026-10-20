import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { Views } from '@/components/Views'
import { Templates } from '@/components/Templates'
import { Privacy } from '@/components/Privacy'
import { DownloadSection } from '@/components/DownloadSection'
import { Faq } from '@/components/Faq'
import { Footer } from '@/components/Footer'
import { PageArcs } from '@/components/Arcs'
import { DemoProvider } from '@/components/demo/store'
import { JsonLd } from '@/components/JsonLd'
import { DownloadProvider } from '@/components/download/DownloadProvider'

export default function Home() {
  return (
    <DownloadProvider>
      <JsonLd />
      <Nav />
      <div className="page">
        <PageArcs />
        <main id="main">
          <Hero />
          <DemoProvider>
            <Features />
            <Views />
          </DemoProvider>
          <Templates />
          <Privacy />
          <DownloadSection />
          <Faq />
        </main>
        <Footer />
      </div>
    </DownloadProvider>
  )
}
