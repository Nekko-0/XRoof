import Link from "next/link"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/landing/hero-section"
import { StepsSection } from "@/components/landing/steps-section"
import { CtaSection } from "@/components/landing/cta-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <StepsSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
