"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  BarChart3,
  Briefcase,
  FileText,
  UserCircle,
  Ruler,
  Calendar,
  Kanban,
  Users,
  Zap,
  CreditCard,
  User,
  PlusCircle,
  Loader2,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { supabase } from "@/lib/supabaseClient"
import { authFetch } from "@/lib/auth-fetch"

const navigationItems = [
  { label: "Dashboard", href: "/contractor/dashboard", icon: BarChart3 },
  { label: "My Jobs", href: "/contractor/leads", icon: FileText },
  { label: "Customers", href: "/contractor/customers", icon: UserCircle },
  { label: "Measure", href: "/contractor/measure", icon: Ruler },
  { label: "Reports", href: "/contractor/report", icon: FileText },
  { label: "Calendar", href: "/contractor/calendar", icon: Calendar },
  { label: "Pipeline", href: "/contractor/pipeline", icon: Kanban },
  { label: "Team", href: "/contractor/team", icon: Users },
  { label: "Automations", href: "/contractor/automations", icon: Zap },
  { label: "Billing", href: "/contractor/billing", icon: CreditCard },
  { label: "Profile", href: "/contractor/profile", icon: User },
]

const quickActions = [
  { label: "New Lead", href: "/contractor/leads?new=true", icon: PlusCircle },
  { label: "Open Measurement Tool", href: "/contractor/measure", icon: Ruler },
]

interface SearchJob {
  id: string
  customer_name: string
  address: string
}

interface SearchCustomer {
  id: string
  name: string
  email: string | null
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [jobs, setJobs] = useState<SearchJob[]>([])
  const [customers, setCustomers] = useState<SearchCustomer[]>([])
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Reset search state when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("")
      setJobs([])
      setCustomers([])
      setLoading(false)
    }
  }, [open])

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setJobs([])
      setCustomers([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      if (!userId) {
        setLoading(false)
        return
      }

      const res = await authFetch(
        `/api/search?q=${encodeURIComponent(q)}&user_id=${encodeURIComponent(userId)}`
      )
      if (res.ok) {
        const data = await res.json()
        setJobs(data.jobs ?? [])
        setCustomers(data.customers ?? [])
      }
    } catch {
      // silently ignore search errors
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        fetchResults(value)
      }, 300)
    },
    [fetchResults]
  )

  const runCommand = (href: string) => {
    setOpen(false)
    router.push(href)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={query}
        onValueChange={handleInputChange}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            "No results found."
          )}
        </CommandEmpty>
        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.href}
              value={item.label}
              onSelect={() => runCommand(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Quick Actions">
          {quickActions.map((item) => (
            <CommandItem
              key={item.label}
              value={item.label}
              onSelect={() => runCommand(item.href)}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>
        {loading && query.length >= 2 && (
          <CommandGroup heading="Searching...">
            <CommandItem disabled value="search-loading">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading results...
            </CommandItem>
          </CommandGroup>
        )}
        {jobs.length > 0 && (
          <CommandGroup heading="Jobs">
            {jobs.map((job) => (
              <CommandItem
                key={`job-${job.id}`}
                value={`job ${job.customer_name} ${job.address}`}
                onSelect={() =>
                  runCommand(`/contractor/leads?job=${job.id}`)
                }
              >
                <Briefcase className="mr-2 h-4 w-4" />
                <span>
                  {job.customer_name}
                  {job.address && (
                    <span className="ml-2 text-muted-foreground">
                      {job.address}
                    </span>
                  )}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {customers.length > 0 && (
          <CommandGroup heading="Customers">
            {customers.map((customer) => (
              <CommandItem
                key={`customer-${customer.id}`}
                value={`customer ${customer.name} ${customer.email ?? ""}`}
                onSelect={() =>
                  runCommand(
                    `/contractor/customers?search=${encodeURIComponent(customer.name)}`
                  )
                }
              >
                <UserCircle className="mr-2 h-4 w-4" />
                <span>
                  {customer.name}
                  {customer.email && (
                    <span className="ml-2 text-muted-foreground">
                      {customer.email}
                    </span>
                  )}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  )
}
