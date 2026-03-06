"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, MessageSquare, User, Wrench, BarChart3, Menu, X, LogOut } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/auth-helpers-nextjs"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/notification-bell"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardShellProps {
  children: React.ReactNode
  role: "homeowner" | "contractor"
}

const homeownerNav: NavItem[] = [
  { label: "Dashboard", href: "/homeowner/dashboard", icon: Home },
  { label: "Post Job", href: "/homeowner/post-job", icon: FileText },
  { label: "Messages", href: "/homeowner/messages", icon: MessageSquare },
  { label: "Profile", href: "/homeowner/profile", icon: User },
]

const contractorNav: NavItem[] = [
  { label: "Dashboard", href: "/contractor/dashboard", icon: BarChart3 },
  { label: "View Leads", href: "/contractor/leads", icon: FileText },
  { label: "Messages", href: "/contractor/messages", icon: MessageSquare },
  { label: "Profile", href: "/contractor/profile", icon: User },
]

export function DashboardShell({ children, role }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = role === "homeowner" ? homeownerNav : contractorNav
  const roleLabel = role === "homeowner" ? "Homeowner" : "Contractor"

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Home className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-sidebar-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              XRoof
            </span>
          </Link>
          <button
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {roleLabel} Portal
          </p>
        </div>

        <nav className="flex-1 px-4 py-2">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 lg:px-8">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <h1
            className="flex-1 text-lg font-semibold text-foreground"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {navItems.find((item) => item.href === pathname)?.label || "Dashboard"}
          </h1>
          <NotificationBell />
        </header>
        <main className="flex-1 p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
