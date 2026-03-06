import Link from "next/link"
import { Home } from "lucide-react"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Home className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            XRoof
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            href="/auth?role=contractor"
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contractor Login
          </Link>
          <Link
            href="/auth?role=homeowner"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Post a Job
          </Link>
        </nav>
      </div>
    </header>
  )
}
