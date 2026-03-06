import Link from "next/link"
import { ArrowRight, Shield, Clock, Star, Home, Wrench } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32 lg:px-8 lg:py-40">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm">
            <Shield className="h-3.5 w-3.5 text-primary" />
            Trusted by homeowners nationwide
          </div>
          <h1
            className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Find Trusted Roofing Contractors Fast
          </h1>
          <p className="mt-6 text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Post your roofing job and get connected with qualified contractors in your area. Simple, fast, and reliable.
          </p>

          {/* Role Selection Boxes */}
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:max-w-xl sm:mx-auto">
            <Link
              href="/auth?role=homeowner"
              className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-card p-8 shadow-sm transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Home className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">I&apos;m a Homeowner</h3>
                <p className="mt-1 text-sm text-muted-foreground">Post a job and find contractors</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>

            <Link
              href="/auth?role=contractor"
              className="group flex flex-col items-center gap-4 rounded-2xl border-2 border-border bg-card p-8 shadow-sm transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                <Wrench className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">I&apos;m a Contractor</h3>
                <p className="mt-1 text-sm text-muted-foreground">Find leads and grow your business</p>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                Get Started <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-20 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Verified Contractors</p>
            <p className="text-xs text-muted-foreground">Quality you can trust</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Fast Matching</p>
            <p className="text-xs text-muted-foreground">Connected in minutes</p>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Star className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Top Rated</p>
            <p className="text-xs text-muted-foreground">Highly reviewed pros</p>
          </div>
        </div>
      </div>
    </section>
  )
}
