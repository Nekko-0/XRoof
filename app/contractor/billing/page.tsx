"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { CreditCard, Check, Zap, Crown, Settings } from "lucide-react"

type Subscription = {
  plan: string
  status: string
  current_period_end: string
} | null

export default function BillingPage() {
  const [sub, setSub] = useState<Subscription>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [checkingOut, setCheckingOut] = useState<string | null>(null)
  const [managingPortal, setManagingPortal] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = "/auth"; return }
      setUserId(session.user.id)

      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status, current_period_end")
        .eq("user_id", session.user.id)
        .in("status", ["active", "past_due", "trialing"])
        .maybeSingle()

      setSub(data || null)
      setLoading(false)
    }
    load()
  }, [])

  const handleSubscribe = async (plan: "monthly" | "annual") => {
    if (!userId) return
    setCheckingOut(plan)
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, plan }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || "Failed to create checkout session")
    } catch (err) {
      alert("Error creating checkout")
    }
    setCheckingOut(null)
  }

  const handleManage = async () => {
    if (!userId) return
    setManagingPortal(true)
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || "Failed to open portal")
    } catch {
      alert("Error opening billing portal")
    }
    setManagingPortal(false)
  }

  if (loading) return <p className="p-6">Loading billing...</p>

  const features = [
    "Unlimited DIY reports",
    "Roof measurement tool",
    "Contract builder & e-signing",
    "Lead management & tracking",
    "Analytics dashboard",
    "Email notifications",
  ]

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
          Billing
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your subscription and payment methods.
        </p>
      </div>

      {sub && sub.status === "active" ? (
        /* Active subscription */
        <div className="rounded-2xl border border-primary/30 bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-foreground">Active Subscription</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Plan: <span className="font-semibold text-foreground capitalize">{sub.plan}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {sub.plan === "annual" ? "$100/month (billed annually)" : "$120/month"}
              </p>
              {sub.current_period_end && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Next billing: {new Date(sub.current_period_end).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                </p>
              )}
            </div>
            <span className="rounded-full bg-emerald-900/30 px-3 py-1 text-xs font-semibold text-emerald-400">
              Active
            </span>
          </div>
          <button
            onClick={handleManage}
            disabled={managingPortal}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            {managingPortal ? "Opening..." : "Manage Subscription"}
          </button>
        </div>
      ) : (
        /* Pricing cards */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Monthly */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Monthly</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$120</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
            </div>
            <ul className="mb-6 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleSubscribe("monthly")}
              disabled={checkingOut === "monthly"}
              className="w-full rounded-xl border-2 border-primary bg-transparent px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                {checkingOut === "monthly" ? "Redirecting..." : "Subscribe Monthly"}
              </span>
            </button>
          </div>

          {/* Annual */}
          <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-sm relative">
            <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-primary-foreground">
              SAVE $240/yr
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-foreground">Annual</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-foreground">$100</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <p className="text-xs text-muted-foreground">Billed as $1,200/year</p>
            </div>
            <ul className="mb-6 space-y-2">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  {f}
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Zap className="h-4 w-4 flex-shrink-0" />
                Priority support
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe("annual")}
              disabled={checkingOut === "annual"}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <CreditCard className="h-4 w-4" />
                {checkingOut === "annual" ? "Redirecting..." : "Subscribe Annual"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Custom Reports */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h3 className="text-base font-bold text-foreground mb-2">Custom Reports</h3>
        <p className="text-sm text-muted-foreground mb-1">
          Need a professional report with measurements, materials, and custom formatting?
        </p>
        <p className="text-sm text-muted-foreground">
          <span className="font-bold text-foreground">$20 per report</span> — includes full measurements, materials estimate, and custom branding.
          DIY reports are unlimited with your subscription.
        </p>
        <p className="mt-3 rounded-lg bg-amber-900/20 border border-amber-800/30 px-3 py-2 text-xs text-amber-400">
          Estimated pitch (~70-75% accurate) — measure on site to confirm
        </p>
      </div>
    </div>
  )
}
