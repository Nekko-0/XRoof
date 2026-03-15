import Link from "next/link"
import { Home } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Home className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                XRoof
              </span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              The all-in-one platform for roofing contractors. Manage leads, send estimates, collect payments, and grow your business.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Product</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link></li>
              <li><Link href="/#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</Link></li>
              <li><Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign Up</Link></li>
            </ul>
          </div>

          {/* Platform */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contractor Login</Link></li>
              <li><Link href="/contractor/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Dashboard</Link></li>
              <li><Link href="/contractor/field" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Field Mode</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Legal</p>
            <ul className="mt-3 space-y-2">
              <li><Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} XRoof. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
