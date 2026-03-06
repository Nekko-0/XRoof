import { Home } from "lucide-react"

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
            <Home className="h-3 w-3 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
            RoofConnect
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {'2026 RoofConnect. All rights reserved.'}
        </p>
      </div>
    </footer>
  )
}
