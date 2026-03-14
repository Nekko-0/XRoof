import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  ArrowRight, BarChart3, Satellite, Smartphone, Zap, FileText,
  CreditCard, Users, Shield, Check, Star,
} from "lucide-react"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "XRoof",
  applicationCategory: "BusinessApplication",
  description:
    "XRoof connects roofing contractors with qualified leads in their area. Sign up, get assigned jobs, submit reports, and grow your business.",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free tier available for roofing contractors",
  },
  url: "https://xroof.app",
}

const features = [
  {
    icon: BarChart3,
    title: "Roofing Intelligence Dashboard",
    description: "Storm correlation, revenue forecasts, deal velocity, and pipeline insights — analytics built specifically for roofers, not generic charts.",
    highlight: "Weather × Revenue Correlation",
  },
  {
    icon: Satellite,
    title: "Satellite Measurement Tool",
    description: "Measure roofs directly from satellite imagery. Draw polygons, set pitch, classify edges, and calculate materials — all without climbing a ladder.",
    highlight: "No Ladder Required",
  },
  {
    icon: Smartphone,
    title: "Mobile Field Mode",
    description: "Big touch targets, today's schedule, one-tap call, quick notes, and mark-complete — designed for the job site, not the office.",
    highlight: "Built for Job Sites",
  },
  {
    icon: Zap,
    title: "Automated Follow-ups",
    description: "Set up email and SMS sequences that fire automatically when leads come in, estimates are sent, or jobs are completed. Never lose a lead to slow follow-up.",
    highlight: "Email + SMS Sequences",
  },
  {
    icon: FileText,
    title: "Estimates & E-Sign Contracts",
    description: "Branded proposals with pricing tiers, photo galleries, and scope of work. Customers sign contracts online with ESIGN-compliant e-signatures.",
    highlight: "Legally Binding E-Sign",
  },
  {
    icon: CreditCard,
    title: "Payments & Milestone Invoicing",
    description: "Collect deposits, progress payments, and final invoices through Stripe. Split jobs into milestones so you get paid as you go.",
    highlight: "Get Paid Faster",
  },
]

const pricingFeatures = [
  "Unlimited leads & jobs",
  "Satellite measurement tool",
  "Branded estimates & proposals",
  "E-sign contracts",
  "Automated follow-ups (email + SMS)",
  "Customer portal",
  "Pipeline & CRM",
  "Stripe payment collection",
  "Team management (up to 3)",
  "Analytics dashboard",
  "Calendar & scheduling",
  "Material calculator",
]

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Star className="h-3 w-3" /> Built for Roofing Contractors
          </span>
          <h1
            className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Run Your Roofing Business
            <br />
            <span className="text-primary">From One Platform</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Leads, estimates, contracts, scheduling, payments, and analytics — everything
            you need to grow your roofing company, without juggling 10 different tools.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
            >
              See Features
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">7-day free trial. No credit card required.</p>
        </section>

        {/* Feature Showcase */}
        <section id="features" className="border-t border-border bg-card/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Everything a Roofing Contractor Needs
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Purpose-built tools that save you hours every week and help you close more deals.
              </p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-2.5 py-0.5 text-[10px] font-bold text-primary">
                    {f.highlight}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Up and Running in Minutes
              </h2>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                { step: "1", title: "Create Your Profile", desc: "Add your company info, service area, and branding. Takes less than 5 minutes." },
                { step: "2", title: "Add Leads & Measure", desc: "Import leads or add them manually. Measure roofs from satellite imagery without leaving your desk." },
                { step: "3", title: "Send Estimates & Get Paid", desc: "Build branded proposals, send contracts for e-sign, and collect payments — all in one flow." },
              ].map((s) => (
                <div key={s.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                    {s.step}
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-border bg-card/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Simple, Transparent Pricing
              </h2>
              <p className="mt-3 text-muted-foreground">
                One plan. Everything included. No hidden fees.
              </p>
            </div>
            <div className="mx-auto mt-12 grid max-w-4xl gap-6 lg:grid-cols-2">
              {/* Monthly */}
              <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
                <p className="text-sm font-semibold text-muted-foreground">Monthly</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">$199</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">7-day free trial. Cancel anytime.</p>
                <Link
                  href="/auth"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-primary bg-transparent px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                >
                  Start Free Trial
                </Link>
                <ul className="mt-6 space-y-2">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Annual */}
              <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
                <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                  SAVE $360/yr
                </div>
                <p className="text-sm font-semibold text-primary">Annual</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">$169</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">7-day free trial. Billed annually ($2,028/yr).</p>
                <Link
                  href="/auth"
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <ul className="mt-6 space-y-2">
                  {pricingFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Built for Roofers */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Built by Roofers, for Roofers
              </h2>
              <p className="mt-4 text-muted-foreground leading-relaxed">
                We built XRoof because we saw roofing contractors wasting hours on spreadsheets, missed follow-ups, and disconnected tools. Every feature is designed around how roofers actually work — from the truck to the office.
              </p>
              <div className="mt-8 grid grid-cols-3 gap-6">
                <div>
                  <Users className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-semibold text-foreground">All-in-One</p>
                  <p className="mt-1 text-xs text-muted-foreground">Leads, estimates, contracts, payments in one place</p>
                </div>
                <div>
                  <Shield className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Secure</p>
                  <p className="mt-1 text-xs text-muted-foreground">Bank-level encryption, ESIGN-compliant contracts</p>
                </div>
                <div>
                  <Smartphone className="mx-auto mb-2 h-8 w-8 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Mobile-First</p>
                  <p className="mt-1 text-xs text-muted-foreground">Works on any device, built for the field</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl rounded-3xl border border-primary/20 bg-primary/5 px-8 py-12">
              <Shield className="mx-auto mb-4 h-10 w-10 text-primary" />
              <h2
                className="text-2xl font-bold text-foreground sm:text-3xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Ready to Grow Your Roofing Business?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Join XRoof and start closing more deals with less busywork.
              </p>
              <Link
                href="/auth"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
              >
                Start Your Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                7-day free trial. No credit card required. Set up in under 5 minutes.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
