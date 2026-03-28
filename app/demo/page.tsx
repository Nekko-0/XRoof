"use client"

import Link from "next/link"
import { useState } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import {
  BarChart3, FileText, Users, Calendar, Kanban, Ruler, CreditCard,
  MessageSquare, Smartphone, Zap, Settings, ClipboardList, Truck,
  Globe, Calculator, Home, ArrowRight, Star, TrendingUp, DollarSign,
  CheckCircle, Clock, AlertTriangle, Target, ArrowUpRight, ArrowDownRight,
  Send, Eye, Receipt, Shield,
} from "lucide-react"

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_JOBS = [
  { id: "1", customer: "Sarah Johnson", address: "1423 Oak Ridge Dr, Dallas TX", status: "new", budget: 18500, date: "Mar 15", source: "Google Ads" },
  { id: "2", customer: "Mike Thompson", address: "892 Cedar Ln, Plano TX", status: "estimate_sent", budget: 24200, date: "Mar 14", source: "Referral" },
  { id: "3", customer: "Lisa Chen", address: "3567 Maple Ave, Frisco TX", status: "contract_signed", budget: 31400, date: "Mar 12", source: "Website" },
  { id: "4", customer: "Robert Williams", address: "741 Elm St, McKinney TX", status: "in_progress", budget: 22800, date: "Mar 10", source: "Storm Canvassing" },
  { id: "5", customer: "Jennifer Davis", address: "2156 Pine Rd, Allen TX", status: "completed", budget: 27600, date: "Mar 8", source: "Google Ads" },
  { id: "6", customer: "David Martinez", address: "4891 Birch Blvd, Richardson TX", status: "new", budget: 15900, date: "Mar 16", source: "Homeowner Post" },
  { id: "7", customer: "Amanda Wilson", address: "623 Spruce Ct, Garland TX", status: "estimate_sent", budget: 19700, date: "Mar 13", source: "Referral" },
  { id: "8", customer: "James Brown", address: "1078 Walnut Dr, Carrollton TX", status: "completed", budget: 35200, date: "Mar 5", source: "Website" },
]

const MOCK_APPOINTMENTS = [
  { time: "9:00 AM", title: "Roof Inspection — Sarah Johnson", type: "inspection" },
  { time: "11:30 AM", title: "Estimate Delivery — Mike Thompson", type: "estimate" },
  { time: "2:00 PM", title: "Material Delivery — Lisa Chen", type: "delivery" },
  { time: "4:00 PM", title: "Final Walkthrough — Robert Williams", type: "walkthrough" },
]

const MOCK_MESSAGES = [
  { from: "Sarah Johnson", text: "When can you start? The leak is getting worse.", time: "2h ago", unread: true },
  { from: "Mike Thompson", text: "I reviewed the estimate, looks good! Let's proceed.", time: "5h ago", unread: true },
  { from: "Lisa Chen", text: "Thank you for the warranty information!", time: "1d ago", unread: false },
]

const PIPELINE_STAGES = [
  { name: "New Leads", count: 2, value: 34400, color: "bg-blue-500" },
  { name: "Estimate Sent", count: 2, value: 43900, color: "bg-amber-500" },
  { name: "Contract Signed", count: 1, value: 31400, color: "bg-emerald-500" },
  { name: "In Progress", count: 1, value: 22800, color: "bg-purple-500" },
  { name: "Completed", count: 2, value: 62800, color: "bg-green-500" },
]

// ─── Demo Sections ───────────────────────────────────────────────────────────

const demoTabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "jobs", label: "My Jobs", icon: FileText },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "messages", label: "Messages", icon: MessageSquare },
]

const statusLabels: Record<string, { label: string; color: string }> = {
  new: { label: "New Lead", color: "bg-blue-500/15 text-blue-600" },
  estimate_sent: { label: "Estimate Sent", color: "bg-amber-500/15 text-amber-600" },
  contract_signed: { label: "Contract Signed", color: "bg-emerald-500/15 text-emerald-600" },
  in_progress: { label: "In Progress", color: "bg-purple-500/15 text-purple-600" },
  completed: { label: "Completed", color: "bg-green-500/15 text-green-400" },
}

function DemoBanner() {
  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center">
      <p className="text-sm text-amber-200">
        <Star className="mr-1 inline h-3.5 w-3.5" />
        You&apos;re viewing a live demo with sample data.{" "}
        <Link href="/auth" className="font-semibold text-amber-100 underline hover:no-underline">
          Start your free trial
        </Link>{" "}
        to use it with real jobs.
      </p>
    </div>
  )
}

function DemoDashboard() {
  const stats = [
    { label: "Revenue (MTD)", value: "$124,500", change: "+18%", up: true, icon: DollarSign },
    { label: "Active Jobs", value: "6", change: "+2", up: true, icon: ClipboardList },
    { label: "Close Rate", value: "67%", change: "+5%", up: true, icon: Target },
    { label: "Avg Deal Size", value: "$24,400", change: "+$1,200", up: true, icon: TrendingUp },
  ]

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-bold text-foreground">{s.value}</p>
            <p className={`mt-1 flex items-center gap-1 text-xs ${s.up ? "text-emerald-600" : "text-red-600"}`}>
              {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {s.change} vs last month
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart Mock */}
        <div className="col-span-2 rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Monthly Revenue</h3>
          <div className="flex h-48 items-end gap-2">
            {[45, 62, 38, 71, 55, 89, 67, 94, 78, 102, 88, 124].map((v, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                  style={{ height: `${(v / 130) * 100}%` }}
                />
                <span className="text-[9px] text-muted-foreground">
                  {["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Today&apos;s Schedule</h3>
          <div className="space-y-3">
            {MOCK_APPOINTMENTS.map((a, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-16 shrink-0 text-xs text-muted-foreground">{a.time}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{a.title}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Summary */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Pipeline Summary</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {PIPELINE_STAGES.map((s) => (
            <div key={s.name} className="text-center">
              <div className={`mx-auto mb-2 h-2 w-2 rounded-full ${s.color}`} />
              <p className="text-xs text-muted-foreground">{s.name}</p>
              <p className="text-lg font-bold text-foreground">{s.count}</p>
              <p className="text-[10px] text-muted-foreground">${(s.value / 1000).toFixed(1)}k</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Messages */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Recent Messages</h3>
        <div className="space-y-3">
          {MOCK_MESSAGES.map((m, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${m.unread ? "bg-primary" : "bg-transparent"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-foreground">{m.from}</p>
                  <span className="text-[10px] text-muted-foreground">{m.time}</span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoJobs() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">All Jobs ({MOCK_JOBS.length})</h3>
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
          <FileText className="h-3 w-3" /> Add Job
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Customer</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Address</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Status</th>
              <th className="py-2 pr-4 text-xs font-medium text-muted-foreground">Budget</th>
              <th className="py-2 text-xs font-medium text-muted-foreground">Source</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_JOBS.map((job) => (
              <tr key={job.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="py-3 pr-4 font-medium text-foreground">{job.customer}</td>
                <td className="py-3 pr-4 text-muted-foreground">{job.address}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusLabels[job.status]?.color}`}>
                    {statusLabels[job.status]?.label}
                  </span>
                </td>
                <td className="py-3 pr-4 text-foreground">${job.budget?.toLocaleString()}</td>
                <td className="py-3 text-muted-foreground">{job.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DemoPipeline() {
  const stages = [
    { name: "New Leads", jobs: MOCK_JOBS.filter((j) => j.status === "new") },
    { name: "Estimate Sent", jobs: MOCK_JOBS.filter((j) => j.status === "estimate_sent") },
    { name: "Contract Signed", jobs: MOCK_JOBS.filter((j) => j.status === "contract_signed") },
    { name: "In Progress", jobs: MOCK_JOBS.filter((j) => j.status === "in_progress") },
    { name: "Completed", jobs: MOCK_JOBS.filter((j) => j.status === "completed") },
  ]

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((stage) => (
        <div key={stage.name} className="w-64 shrink-0">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">{stage.name}</p>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
              {stage.jobs.length}
            </span>
          </div>
          <div className="space-y-2">
            {stage.jobs.map((job) => (
              <div
                key={job.id}
                className="rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/30"
              >
                <p className="text-xs font-semibold text-foreground">{job.customer}</p>
                <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{job.address}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-primary">${job.budget?.toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">{job.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function DemoCalendar() {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const today = 17
  const eventsOnDay: Record<number, number> = { 10: 2, 14: 1, 17: 4, 19: 1, 22: 3, 25: 2, 28: 1 }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">March 2026</h3>
        <div className="grid grid-cols-7 gap-1 text-center">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="py-2 text-[10px] font-medium text-muted-foreground">{d}</div>
          ))}
          {/* offset for March 2026 starting on Sunday */}
          {days.map((day) => (
            <div
              key={day}
              className={`relative rounded-lg py-2 text-xs ${
                day === today
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-foreground hover:bg-secondary"
              }`}
            >
              {day}
              {eventsOnDay[day] && (
                <div className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {Array.from({ length: Math.min(eventsOnDay[day], 3) }).map((_, i) => (
                    <div key={i} className="h-1 w-1 rounded-full bg-primary" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Today&apos;s Appointments</h3>
        <div className="space-y-3">
          {MOCK_APPOINTMENTS.map((a, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-3">
              <div className="flex h-10 w-16 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-xs font-bold text-primary">{a.time}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-[10px] text-muted-foreground capitalize">{a.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function DemoMessages() {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border p-4">
        <h3 className="text-sm font-semibold text-foreground">Portal Messages</h3>
      </div>
      <div className="divide-y divide-border">
        {MOCK_MESSAGES.map((m, i) => (
          <div key={i} className="flex items-start gap-3 p-4 hover:bg-secondary/30">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {m.from.split(" ").map((n) => n[0]).join("")}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{m.from}</p>
                {m.unread && <span className="h-2 w-2 rounded-full bg-primary" />}
                <span className="ml-auto text-[10px] text-muted-foreground">{m.time}</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Demo Page ──────────────────────────────────────────────────────────

const sidebarItems = [
  { icon: BarChart3, label: "Dashboard", id: "dashboard" },
  { icon: FileText, label: "My Jobs", id: "jobs" },
  { icon: Ruler, label: "Measure", id: "measure" },
  { icon: FileText, label: "Estimates", id: "estimates" },
  { icon: Calendar, label: "Calendar", id: "calendar" },
  { icon: Kanban, label: "Pipeline", id: "pipeline" },
  { icon: Users, label: "Team", id: "team" },
  { icon: ClipboardList, label: "Work Orders", id: "work-orders" },
  { icon: Truck, label: "Dispatch", id: "dispatch" },
  { icon: Calculator, label: "Materials", id: "materials" },
  { icon: Globe, label: "Landing Pages", id: "landing-pages" },
  { icon: Zap, label: "Automations", id: "automations" },
  { icon: MessageSquare, label: "Messages", id: "messages" },
  { icon: CreditCard, label: "Billing", id: "billing" },
  { icon: Settings, label: "Settings", id: "settings" },
]

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState("dashboard")

  const content: Record<string, React.ReactNode> = {
    dashboard: <DemoDashboard />,
    jobs: <DemoJobs />,
    pipeline: <DemoPipeline />,
    calendar: <DemoCalendar />,
    messages: <DemoMessages />,
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <DemoBanner />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden w-56 border-r border-border bg-card lg:block">
          <div className="flex h-14 items-center gap-2 border-b border-border px-6">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
              <Home className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
              Demo Co. Roofing
            </span>
          </div>
          <nav className="p-3">
            <ul className="space-y-0.5">
              {sidebarItems.map((item) => {
                const isClickable = ["dashboard", "jobs", "pipeline", "calendar", "messages"].includes(item.id)
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => isClickable && setActiveTab(item.id)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                        activeTab === item.id
                          ? "bg-primary/10 text-primary"
                          : isClickable
                            ? "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            : "text-muted-foreground/50 cursor-default"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex flex-1 flex-col">
          {/* Mobile tabs */}
          <div className="flex gap-1 overflow-x-auto border-b border-border bg-card px-4 py-2 lg:hidden">
            {demoTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Top bar */}
          <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
            <h1 className="text-sm font-semibold text-foreground capitalize" style={{ fontFamily: "var(--font-heading)" }}>
              {activeTab === "jobs" ? "My Jobs" : activeTab}
            </h1>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                DEMO MODE
              </span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 p-6">
            {content[activeTab] || (
              <div className="flex h-64 items-center justify-center text-center">
                <div>
                  <p className="text-sm text-muted-foreground">This section is available in the full version.</p>
                  <Link
                    href="/auth"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                  >
                    Start Free Trial <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Like what you see? Start your free 7-day trial — cancel anytime.
          </p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition-all hover:bg-primary/90"
          >
            Start Free Trial <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
