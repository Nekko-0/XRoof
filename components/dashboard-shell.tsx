"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, FileText, MessageSquare, User, Wrench, BarChart3, Menu, X, LogOut, Users, ClipboardList, Ruler, CreditCard, Calendar, Kanban, Crosshair, Zap, Search, UserCircle, Smartphone, Settings, HelpCircle, Mail, Calculator, Truck, Globe, Receipt} from "lucide-react"
import { useState, useMemo, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { NAV_PERMISSIONS } from "@/lib/permissions"
import { NotificationBell } from "@/components/notification-bell"
import { useUnreadPortalCount } from "@/hooks/use-unread-portal-count"
import { CommandPalette } from "@/components/command-palette"
import { useRole } from "@/lib/role-context"
import { getRoleLabel } from "@/lib/permissions"
import { InstallPrompt } from "@/components/install-prompt"
import { AnnouncementBanner } from "@/components/announcement-banner"
import WhatsNewBell from "@/components/whats-new-bell"
import { ProductTour } from "@/components/product-tour"

const TOUR_IDS: Record<string, string> = {
  Dashboard: "dashboard",
  "My Jobs": "jobs",
  Measure: "measure",
  Pipeline: "pipeline",
}

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
  desktopOnly?: boolean
}

interface DashboardShellProps {
  children: React.ReactNode
  role: "contractor" | "admin"
}

const contractorNav: NavItem[] = [
  { label: "Dashboard", href: "/contractor/dashboard", icon: BarChart3 },
  { label: "My Jobs", href: "/contractor/leads", icon: FileText },
  { label: "Customers", href: "/contractor/customers", icon: UserCircle },
  { label: "Measure", href: "/contractor/measure", icon: Ruler },
  { label: "Estimates", href: "/contractor/reports", icon: FileText },
  { label: "Calendar", href: "/contractor/calendar", icon: Calendar },
  { label: "Pipeline", href: "/contractor/pipeline", icon: Kanban },
  { label: "Team", href: "/contractor/team", icon: Users, adminOnly: true, desktopOnly: true },
  { label: "Work Orders", href: "/contractor/work-orders", icon: ClipboardList, adminOnly: true, desktopOnly: true },
  { label: "Dispatch", href: "/contractor/dispatch", icon: Truck, adminOnly: true, desktopOnly: true },
  { label: "Materials", href: "/contractor/materials", icon: Calculator },
  { label: "Quick Estimate", href: "/contractor/quick-estimate", icon: Receipt, desktopOnly: true },

  { label: "Landing Pages", href: "/contractor/landing-pages", icon: Globe, adminOnly: true, desktopOnly: true },
  { label: "Automations", href: "/contractor/automations", icon: Zap, adminOnly: true, desktopOnly: true },
  { label: "Messages", href: "/contractor/messages", icon: MessageSquare },
  { label: "Billing", href: "/contractor/billing", icon: CreditCard, adminOnly: true, desktopOnly: true },
  { label: "Settings", href: "/contractor/settings", icon: Settings, adminOnly: true, desktopOnly: true },
  { label: "Profile", href: "/contractor/profile", icon: User },
]

const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: BarChart3 },
  { label: "Leads", href: "/admin/jobs", icon: ClipboardList },
  { label: "Contractors", href: "/admin/contractors", icon: Users },
  { label: "Measure", href: "/admin/measure", icon: Ruler },
  { label: "Reports", href: "/admin/reports", icon: FileText },
  { label: "Measurements", href: "/admin/measurement-requests", icon: Crosshair },
  { label: "Support", href: "/admin/messages", icon: MessageSquare },
]

// Bottom tab bar items for contractor mobile
const contractorTabs: NavItem[] = [
  { label: "Home", href: "/contractor/dashboard", icon: Home },
  { label: "Jobs", href: "/contractor/leads", icon: FileText },
  { label: "Field", href: "/contractor/field", icon: Smartphone },
  { label: "Calendar", href: "/contractor/calendar", icon: Calendar },
  { label: "Messages", href: "/contractor/messages", icon: MessageSquare },
]

export function DashboardShell({ children, role }: DashboardShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { role: teamRole, granularRole, isOwner, accountId, can } = useRole()
  const isContractor = role === "contractor"
  const unreadPortalCount = useUnreadPortalCount()

  // Search
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ type: string; label: string; sub: string; href: string }[]>([])
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !accountId) { setSearchResults([]); return }
    try {
      const res = await authFetch(`/api/search?q=${encodeURIComponent(q)}&contractor_id=${accountId}`)
      const data = await res.json()
      setSearchResults(data.results || [])
    } catch { setSearchResults([]) }
  }, [accountId])

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!searchQuery.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(() => doSearch(searchQuery), 300)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery, doSearch])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Filter nav items based on granular permissions
  const navItems = useMemo(() => {
    const items = role === "admin" ? adminNav : contractorNav
    if (role === "admin" || isOwner) return items
    return items.filter((item) => {
      const requiredPerm = NAV_PERMISSIONS[item.href]
      if (!requiredPerm) return !item.adminOnly // fallback to legacy check
      return can(requiredPerm)
    })
  }, [role, teamRole, can])

  const roleLabel = isOwner ? "Owner" : getRoleLabel(granularRole)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen bg-background">
      <CommandPalette />
      {isContractor && <ProductTour />}
      {/* Mobile overlay — admin only */}
      {mobileOpen && !isContractor && (
        <div className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar — hidden on mobile for contractor, hamburger for admin */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-56 sm:w-64 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200 md:static md:translate-x-0",
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
            className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-foreground md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pt-4">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {isContractor ? `${roleLabel} Portal` : "XRoof Owner Portal"}
          </p>
          {isContractor && (
            <div ref={searchRef} className="relative mb-2" data-tour="search">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                <Search className="h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true) }}
                  onFocus={() => setSearchOpen(true)}
                  placeholder="Search jobs, customers..."
                  className="flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground/50"
                />
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
                  {searchResults.map((r, i) => (
                    <Link
                      key={i}
                      href={r.href}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); setMobileOpen(false) }}
                      className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-secondary transition-colors"
                    >
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">{r.type}</span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{r.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <nav className="flex-1 px-4 py-2">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === "/contractor/settings" && pathname.startsWith("/contractor/settings"))
              return (
                <li key={item.href} className={cn(item.desktopOnly && "hidden lg:block")}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    data-tour={TOUR_IDS[item.label]}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-primary"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                    {item.label === "Messages" && unreadPortalCount > 0 && (
                      <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-bold text-destructive-foreground">
                        {unreadPortalCount > 9 ? "9+" : unreadPortalCount}
                      </span>
                    )}
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
          "flex h-14 items-center gap-4 border-b border-border bg-card px-4 md:h-16 md:px-8",
          isContractor && "md:flex"
        )}>
          {/* Hamburger — admin mobile only */}
          {!isContractor && (
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-foreground md:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </button>
          )}
          <h1
            className={cn(
              "flex-1 text-lg font-semibold text-foreground",
              isContractor && "text-center md:text-left"
            )}
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {navItems.find((item) => item.href === pathname || (item.href === "/contractor/settings" && pathname.startsWith("/contractor/settings")))?.label || "Dashboard"}
          </h1>
          <div className="flex items-center gap-2">
            {isContractor && <WhatsNewBell />}
            <NotificationBell />
          </div>
        </header>
        {isContractor && <AnnouncementBanner />}
        <main className={cn(
          "flex-1 p-4 md:p-8",
          isContractor && "pb-24 md:pb-8"
        )}>
          {children}
        </main>
      </div>

      {/* Bottom tab bar — contractor mobile only */}
      {isContractor && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border bg-card py-2 safe-bottom md:hidden">
          {contractorTabs.map((tab) => {
            const isActive = pathname === tab.href || (tab.href === "/contractor/dashboard" && pathname.startsWith("/contractor/leads"))
            const showBadge = tab.label === "Messages" && unreadPortalCount > 0
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex flex-col items-center gap-1 px-4 py-2 text-xs font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <tab.icon className={cn("h-6 w-6", isActive && "text-primary")} />
                {showBadge && (
                  <span className="absolute top-1 right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadPortalCount > 9 ? "9+" : unreadPortalCount}
                  </span>
                )}
                {tab.label}
              </Link>
            )
          })}
        </nav>
      )}

      {/* PWA Install Prompt — contractor only */}
      {isContractor && <InstallPrompt />}
    </div>
  )
}
