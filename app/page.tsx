import { SiteNavbar } from '@/components/landing/site-navbar'
import { Hero } from '@/components/landing/hero'
import { Features } from '@/components/landing/features'
import { HowItWorks } from '@/components/landing/how-it-works'
import { CtaSection } from '@/components/landing/cta'

export default function LandingPage() {
  return (
    <div className="min-h-svh">
      <SiteNavbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CtaSection />
      </main>
    </div>
  )
}
