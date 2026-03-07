import Link from "next/link"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { Wrench, Users, FileText, ArrowRight } from "lucide-react"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6 lg:px-8">
          <h1
            className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Get Roofing Leads
            <br />
            <span className="text-primary">Sent Directly to You</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            XRoof connects roofing contractors with qualified leads in their area.
            Sign up, get assigned jobs, submit reports, and grow your business.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Benefits */}
        <section className="border-t border-border bg-card/50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2
              className="mb-10 text-center text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              How XRoof Works for Contractors
            </h2>
            <div className="grid gap-8 sm:grid-cols-3">
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Sign Up</h3>
                <p className="text-sm text-muted-foreground">
                  Create your contractor profile with your company info, service area, and credentials.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Wrench className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Get Leads</h3>
                <p className="text-sm text-muted-foreground">
                  Receive qualified roofing leads assigned directly to you based on your service area.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">Submit Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Complete jobs and submit detailed reports with pricing and scope of work.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16">
          <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Ready to Grow Your Roofing Business?
            </h2>
            <p className="mt-2 text-muted-foreground">
              Join XRoof today and start receiving qualified leads.
            </p>
            <Link
              href="/auth"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign Up as a Contractor
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
