import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { AuthRedirect } from "@/components/auth-redirect"
import {
  ArrowRight, BarChart3, Satellite, Smartphone, Zap, FileText,
  CreditCard, Users, Shield, Check, Star, ChevronDown, Play,
  Calendar, Ruler, MessageSquare, Globe, ClipboardList, Kanban,
} from "lucide-react"

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "XRoof",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web, iOS, Android",
  description:
    "All-in-one roofing contractor CRM — satellite measurements, branded estimates, e-sign contracts, automated follow-ups, milestone payments, customer portal, dispatch, and analytics.",
  url: "https://xroof.io",
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "169",
    highPrice: "199",
    priceCurrency: "USD",
    offerCount: "2",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    reviewCount: "1",
    bestRating: "5",
  },
  featureList: [
    "Satellite roof measurement",
    "Branded estimates & proposals",
    "E-sign contracts",
    "Stripe payment collection",
    "Automated email & SMS follow-ups",
    "Customer portal",
    "Dispatch & scheduling",
    "Team management",
    "Pipeline CRM",
    "Material calculator",
    "Landing page builder",
    "Analytics dashboard",
  ],
}

const features = [
  {
    icon: Satellite,
    title: "Satellite Roof Measurement",
    description: "Measure any roof from satellite imagery — draw polygons, set pitch, classify edges, calculate materials. Skip the ladder, close deals faster.",
    highlight: "No Ladder Required",
  },
  {
    icon: BarChart3,
    title: "Roofing Intelligence Dashboard",
    description: "Storm correlation, revenue forecasts, deal velocity, pipeline health — analytics built for roofers, not generic charts from a spreadsheet.",
    highlight: "Weather × Revenue",
  },
  {
    icon: FileText,
    title: "Estimates & E-Sign Contracts",
    description: "Branded proposals with pricing tiers, material swatches, and photo galleries. Customers sign contracts online — legally binding, ESIGN-compliant.",
    highlight: "Close Deals Remotely",
  },
  {
    icon: Zap,
    title: "Automated Follow-ups",
    description: "Email and SMS sequences that fire automatically when leads come in, estimates are sent, or jobs wrap up. Never lose a deal to slow follow-up again.",
    highlight: "Email + SMS Drips",
  },
  {
    icon: CreditCard,
    title: "Payments & Invoicing",
    description: "Collect deposits, progress payments, and final invoices through Stripe. Split jobs into milestones so you get paid as the work gets done.",
    highlight: "Get Paid Faster",
  },
  {
    icon: Smartphone,
    title: "Mobile Field Mode",
    description: "Big touch targets, today's schedule, one-tap call, quick notes, mark-complete — designed for the job site, not a desktop.",
    highlight: "Built for the Truck",
  },
  {
    icon: MessageSquare,
    title: "Customer Portal",
    description: "Homeowners track their project, view materials, sign contracts, make payments, and message you — all from one branded portal link.",
    highlight: "White-Label Portal",
  },
  {
    icon: Calendar,
    title: "Calendar & Dispatch",
    description: "Drag-and-drop scheduling, crew dispatch board, appointment reminders, and Google Calendar sync. Keep your whole team on the same page.",
    highlight: "Crew Scheduling",
  },
  {
    icon: Kanban,
    title: "Sales Pipeline CRM",
    description: "Drag leads through stages, track close rates, set follow-up reminders, and see your entire sales funnel at a glance. Built specifically for roofing sales.",
    highlight: "Visual Pipeline",
  },
]

const allFeatures = [
  "Unlimited leads & jobs",
  "Satellite roof measurement",
  "Branded estimates & proposals",
  "E-sign contracts",
  "Automated follow-ups (email + SMS)",
  "Customer portal (white-label)",
  "Sales pipeline CRM",
  "Stripe payment collection",
  "Milestone invoicing",
  "Team management ($39/mo per seat)",
  "Role-based permissions",
  "Analytics dashboard",
  "Calendar & scheduling",
  "Dispatch board",
  "Work order management",
  "Material calculator",
  "Landing page builder",
  "Google Calendar sync",
  "SMS messaging (Twilio)",
  "PDF proposal generation",
  "Job photo gallery",
  "Warranty cards",
  "Referral program",
  "Mobile field mode (PWA)",
]

const comparisonFeatures = [
  { feature: "Satellite roof measurement", xroof: true, roofr: "Add-on", jobnimbus: false, acculynx: false },
  { feature: "Branded estimates & e-sign", xroof: true, roofr: true, jobnimbus: true, acculynx: true },
  { feature: "Customer portal", xroof: true, roofr: false, jobnimbus: false, acculynx: true },
  { feature: "Automated email + SMS follow-ups", xroof: true, roofr: false, jobnimbus: "Add-on", acculynx: "Add-on" },
  { feature: "Stripe payment collection", xroof: true, roofr: true, jobnimbus: true, acculynx: true },
  { feature: "Dispatch & crew scheduling", xroof: true, roofr: false, jobnimbus: true, acculynx: true },
  { feature: "Sales pipeline CRM", xroof: true, roofr: false, jobnimbus: true, acculynx: true },
  { feature: "Landing page builder", xroof: true, roofr: false, jobnimbus: false, acculynx: false },
  { feature: "Material calculator + swatches", xroof: true, roofr: "Basic", jobnimbus: false, acculynx: false },
  { feature: "Mobile field mode (PWA)", xroof: true, roofr: false, jobnimbus: "App", acculynx: "App" },
  { feature: "Starting price", xroof: "$169/mo", roofr: "$149/mo", jobnimbus: "$200/mo", acculynx: "$250/mo+" },
]

const faqs = [
  {
    q: "Is there a free trial?",
    a: "Yes — 7-day free trial, no credit card required. You get full access to every feature so you can test XRoof with real jobs before committing.",
  },
  {
    q: "Can my whole crew use it?",
    a: "Your plan includes 1 owner seat. Add team members for $39/month each with role-based permissions (admin, office manager, sales, field tech, viewer). Each member gets their own login with access based on their role.",
  },
  {
    q: "How does the satellite measurement tool work?",
    a: "Search an address, and we pull up satellite imagery. You draw the roof outline, set the pitch, classify edges (ridge, hip, valley, eave, rake), and XRoof calculates area, waste factor, and materials automatically.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from your billing page anytime. No contracts, no cancellation fees. Monthly plans stop at the end of the billing cycle. Annual plans are refundable within 30 days.",
  },
  {
    q: "Does it work on my phone?",
    a: "XRoof is a Progressive Web App (PWA) — install it on your iPhone or Android home screen and it works like a native app. Field Mode is designed specifically for on-site use with large touch targets.",
  },
  {
    q: "How do payments work?",
    a: "You connect your Stripe account, and XRoof handles deposits, progress payments, and final invoices. Homeowners pay through a secure link — funds go directly to your bank account.",
  },
  {
    q: "Can I import my existing leads?",
    a: "Yes — upload a CSV file of your leads, customers, or jobs from any spreadsheet or CRM and XRoof imports them in bulk. No manual re-entry required.",
  },
  {
    q: "What makes XRoof different from other roofing CRMs?",
    a: "XRoof is the only platform that includes satellite measurement, branded customer portals, automated follow-ups, and a landing page builder — all in one tool at one price. No add-ons, no per-user fees, no surprises.",
  },
]

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="mx-auto h-4 w-4 text-cyan-400" />
  if (value === false) return <span className="text-muted-foreground">—</span>
  return <span className="text-xs text-amber-500">{value}</span>
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto max-w-7xl px-4 py-24 text-center sm:px-6 lg:px-8 lg:py-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Star className="h-3 w-3" /> Built for Roofing Contractors
          </span>
          <h1
            className="mt-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Stop Juggling 10 Tools.
            <br />
            <span className="text-primary">Run Your Roofing Business From One.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Measure roofs from satellite, send branded estimates, collect e-signatures,
            automate follow-ups, and get paid — all without leaving XRoof. Set up in 5 minutes.
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
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
            >
              <Play className="h-4 w-4" />
              Try the Demo
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">7-day free trial. No credit card required.</p>
        </section>

        {/* Stats Bar */}
        <section className="border-y border-border bg-card/50">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-4 py-8 text-center sm:grid-cols-4 sm:px-6">
            <div>
              <p className="text-2xl font-bold text-foreground">24+</p>
              <p className="mt-1 text-xs text-muted-foreground">Built-In Features</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">$0</p>
              <p className="mt-1 text-xs text-muted-foreground">Setup Fees</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">5 min</p>
              <p className="mt-1 text-xs text-muted-foreground">To Get Started</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">100%</p>
              <p className="mt-1 text-xs text-muted-foreground">Mobile-Ready</p>
            </div>
          </div>
        </section>

        {/* Screenshot Placeholder */}
        <section className="py-16">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-primary/5">
              <div className="flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3">
                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                <span className="ml-2 text-xs text-muted-foreground">xroof.io/contractor/dashboard</span>
              </div>
              {/* Replace this div with actual screenshot: <Image src="/screenshots/dashboard.png" /> */}
              <div className="flex h-80 items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/5 sm:h-96 lg:h-[480px]">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-16 w-16 text-primary/30" />
                  <p className="mt-4 text-sm text-muted-foreground">Dashboard Preview</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Screenshot coming soon</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Showcase */}
        <section id="features" className="border-t border-border bg-card/30 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground sm:text-4xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Everything a Roofing Contractor Needs
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                Purpose-built tools that save you hours every week and help you close more deals.
                No add-ons, no per-user fees.
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
                Up and Running in 5 Minutes
              </h2>
              <p className="mt-3 text-muted-foreground">No IT department required.</p>
            </div>
            <div className="mt-12 grid gap-8 sm:grid-cols-3">
              {[
                { step: "1", title: "Create Your Profile", desc: "Add your company info, logo, service area, and branding. Takes less than 5 minutes." },
                { step: "2", title: "Add Leads & Measure", desc: "Import leads from a CSV or add them manually. Measure roofs from satellite imagery without leaving your desk." },
                { step: "3", title: "Send Estimates & Get Paid", desc: "Build branded proposals, send contracts for e-sign, and collect milestone payments — all in one flow." },
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
                className="text-3xl font-bold text-foreground sm:text-4xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Simple, Transparent Pricing
              </h2>
              <p className="mt-3 text-muted-foreground">
                One plan. Everything included. No hidden fees, no per-user charges.
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
                  {allFeatures.slice(0, 12).map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 flex-shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                  <li className="pt-1 text-xs text-muted-foreground/60">+ {allFeatures.length - 12} more features</li>
                </ul>
              </div>
              {/* Annual */}
              <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-lg shadow-primary/10">
                <div className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
                  SAVE $360/yr
                </div>
                <p className="text-sm font-semibold text-primary">Annual — Best Value</p>
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
                  {allFeatures.map((f) => (
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

        {/* Competitor Comparison */}
        <section id="compare" className="py-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground sm:text-4xl"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                How XRoof Compares
              </h2>
              <p className="mt-3 text-muted-foreground">
                Feature-for-feature comparison with leading roofing software.
              </p>
            </div>
            <div className="mt-12 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 pr-4 text-left text-xs font-semibold text-muted-foreground">Feature</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-primary">XRoof</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Roofr</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">JobNimbus</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">AccuLynx</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((row) => (
                    <tr key={row.feature} className="border-b border-border/50">
                      <td className="py-3 pr-4 text-sm text-foreground">{row.feature}</td>
                      <td className="px-4 py-3 text-center">
                        {typeof row.xroof === "string" ? (
                          <span className="text-xs font-bold text-primary">{row.xroof}</span>
                        ) : (
                          <ComparisonCell value={row.xroof} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.roofr} /></td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.jobnimbus} /></td>
                      <td className="px-4 py-3 text-center"><ComparisonCell value={row.acculynx} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted-foreground/50">
              Comparison based on publicly available information as of March 2026. Features and pricing may vary by plan.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="border-t border-border bg-card/30 py-20">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <h2
                className="text-3xl font-bold text-foreground"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                Frequently Asked Questions
              </h2>
            </div>
            <div className="mt-12 space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/20 [&[open]]:border-primary/30"
                >
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-foreground">
                    {faq.q}
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </p>
                </details>
              ))}
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
                We built XRoof because roofing contractors deserve better than clunky generic CRMs and duct-taped spreadsheets. Every feature is designed around how roofers actually work — from the truck to the office.
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
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
                >
                  Start Your Free Trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/50"
                >
                  <Play className="h-4 w-4" />
                  Try the Demo
                </Link>
              </div>
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
