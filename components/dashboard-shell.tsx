"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, MessageSquare, User, Wrench, BarChart3, Menu, X, LogOut, Users, ClipboardList, Ruler } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { cn } from "@/lib/utils"
import { NotificationBell } from "@/components/notification-bell"

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface DashboardShellProps {
  children: React.ReactNode
  role: "contractor" | "admin"
}

const contractorNav: NavItem[] = [
  { label: "Dashboard", href: "/contractor/dashboard", icon: BarChart3 },
  { label: "My Jobs", href: "/contractor/leads", icon: FileText },
  { label: "Measure", href: "/contractor/measure", icon: Ruler },
  { label: "Reports", href: "/contractor/report", icon: FileText },
  { label: "Messages", href: "/contractor/messages", icon: MessageSquare },
  { label: "Profile", href: "/contractor/profile", icon: User },
]

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Leads", href: "/admin/jobs", icon: ClipboardList },
  { label: "Contractors", href: "/admin/contractors", icon: Users },
  { label: "Measure", href: "/admin/measure", icon: Ruler },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Messages", href: "/admin/messages", icon: MessageSquare },
]

// Bottom tab bar items for contractor mobile
const contractorTabs: NavItem[] = [
  { label: "Home", href: "/contractor/dashboard", icon: Home },
  { label: "Messages", href: "/contractor/messages", icon: MessageSquare },
  { label: "Profile", href: "/contractor/profile", icon: User },
]

export function DashboardShell({ children, role }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const navItems = role === "admin" ? adminNav : contractorNav
  const roleLabel = role === "admin" ? "Admin" : "Contractor"
  const isContractor = role === "contractor"

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay — admin only */}
      {mobileOpen && !isContractor && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile for contractor, hamburger for admin */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 sm:w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 lg:static lg:translate-x-0",
          isContractor
            ? "-translate-x-full lg:translate-x-0"
            : mobileOpen ? "translate-x-0" : "-translate-x-full"
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
        <header className={cn(
          "flex h-14 items-center gap-4 border-b border-border bg-card px-4 lg:h-16 lg:px-8",
          isContractor && "lg:flex"
        )}>
          {/* Hamburger — admin mobile only */}
          {!isContractor && (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <h1
            className={cn(
              "flex-1 text-lg font-semibold text-foreground",
              isContractor && "text-center lg:text-left"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {navItems.find((item) => item.href === pathname)?.label || "Dashboard"}
          </h1>
          <NotificationBell />
        </header>
        <main className={cn(
          "flex-1 p-4 lg:p-8",
          isContractor && "pb-24 lg:pb-8"
        )}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar — contractor mobile only */}
      {isContractor && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 safe-bottom lg:hidden">
          {contractorTabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === "/contractor/dashboard" && pathname.startsWith("/contractor/leads"))
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <tab.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}
    </div>
  )
}
